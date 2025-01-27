import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { MongoClient } from 'mongodb';
import * as amqp from 'amqplib';
import { DAGDto } from '../src/dag/dto/dag.dto';
import { ScheduledTaskDto } from '../src/scheduler/dto/scheduled-task.dto';
import exp from 'constants';
import { ExternalExceptionFilterContext } from '@nestjs/core/exceptions/external-exception-filter-context';
import { getOneMessageFrom, sleep } from './helpers';
import { ReadPacket, Transport } from '@nestjs/microservices';
import { SendWorkflowDto } from '../src/workflows/dto/send-workflow.dto';
import { internalBootstrap } from '../src/bootstrapper';
import { max, retry } from 'rxjs';
import { WorkerMock } from './worker.mock';
import { resourceLimits } from 'worker_threads';

describe('Single Worker (e2e)', () => {
  let app: INestApplication;
  let mongoClient: MongoClient;
  let connection: amqp.Connection;
  let channel: amqp.Channel;
  let worker: WorkerMock;
  const consumerTags: string[] = [];

  beforeAll(async () => {
    // Connect to MongoDB
    mongoClient = await MongoClient.connect(process.env.MONGO_CONNECTION);

    // Connect to RabbitMQ
    connection = await amqp.connect(process.env.RABBITMQ_URL);
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).setLogger(new Logger()).compile();
    channel = await connection.createChannel();
    channel.assertQueue('task_events');
    channel.assertQueue('artifact_events');
    channel.assertQueue('worker_events');
    channel.assertQueue('worker');

    app = moduleFixture.createNestApplication();
    worker = new WorkerMock({
      channel: channel,
      connection: connection,
      listensOn: 'worker',
      name: 'test-worker',
    });

    internalBootstrap(app);

    await app.startAllMicroservices();
    await app.init();
  });

  afterEach(async () => {
    // Clean MongoDB collections
    const db = mongoClient.db();
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
    }

    for (const tag of consumerTags) {
      await channel.cancel(tag);
    }
    consumerTags.length = 0;

    // Clean RabbitMQ queues
    await channel.deleteQueue('task_events');
    await channel.deleteQueue('artifact_events');
    await channel.deleteQueue('worker_events');
    await channel.deleteQueue('worker');
    await channel.close();

    await app.close();
  });

  afterAll(async () => {
    await mongoClient.close();
    await connection.close();
  });

  it('create a new workflow and check that the right tasks get scheduled when the worker registers before the workflow gets created and then be able to work through the DAG based on task dependencies', async () => {
    await worker.sendHeartbeat();
    console.log('Sent heartbeat to register worker');

    const response = await request(app.getHttpServer())
      .post('/workflows')
      .send({
        version: 1,
        workflow: {
          name: 'test-workflow',
          desription: 'A test workflow',
          tasks: [
            {
              name: 'task-1',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-1']
            },
            {
              name: 'task-2',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-2'],
              dependencies: [
                {
                  type: 'task',
                  id: 'task-1',
                }
              ]
            }
          ],
          completionCriteria: [
            {
              type: 'task',
              id: 'task-2'
            }
          ],
          cleanupPolicy: "after 1 day"
        },
      })
      .expect(201);

    const createdWorkflow = response.body as SendWorkflowDto;

    // register worker to receive messages

    const message = await worker.receiveTask();
    const dag: DAGDto = createdWorkflow.dag;
    expect(dag).toBeDefined();
    expect(dag.nodes).toHaveLength(2);
    expect(dag.nodes[0].id).toBe('w-test-workflow-t-0');
    expect(dag.nodes[1].id).toContain('w-test-workflow-t-1');
    expect(dag.nodes[0].edges).toHaveLength(1);
    expect(dag.nodes[1].edges).toHaveLength(1);

    expect(message).toBeDefined();
    expect(message.id).toBe('w-test-workflow-t-0');
    expect(message.name).toBe('task-1');
    expect(message.parameters).toEqual({ message: 'Hello World!' });
    expect(message.results).toEqual(['result-1']);
    console.log('Received and validated message and DAG');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-0');
    console.log('Sent message to simulate start of execution of first task');

    // Send a message to simulate the completion of the first task
    await worker.sendTaskProcessingCompleted('w-test-workflow-t-0');
    console.log('Sent message to simulate completion of first task');

    // Check that the second task is scheduled
    const message2 = await worker.receiveTask();
    expect(message2).toBeDefined();
    expect(message2.id).toBe('w-test-workflow-t-1');
    expect(message2.name).toBe('task-2');
    expect(message2.parameters).toEqual({ message: 'Hello World!' });
    console.log('Received and validated message for second task');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-1');
    console.log('Sent message to simulate start of execution of second task');

    // Send a message to simulate the completion of the second task
    await worker.sendTaskProcessingCompleted('w-test-workflow-t-1');
    console.log('Sent message to simulate completion of second task');

    // wait to give the backend time to process the messages
    await new Promise((r) => setTimeout(r, 500));

    const workflowEndResult = await request(app.getHttpServer())
      .get(`/workflows/${response.body.id}?includeDAG=true`)
      .expect(200);

    const endResult = workflowEndResult.body as SendWorkflowDto;
    expect(endResult).toBeDefined();
    expect(endResult.status).toBe('succeeded');
    expect(endResult.dag).toBeDefined();
    expect(endResult.dag.nodes).toHaveLength(2);
    expect(endResult.dag.nodes[0].status).toBe('succeeded');
    expect(endResult.dag.nodes[1].status).toBe('succeeded');
    expect(endResult.id).toBe(createdWorkflow.id);
    expect(endResult.name).toBe(createdWorkflow.name);
    expect(endResult.tasks).toEqual(createdWorkflow.tasks);
    expect(endResult.cleanupPolicy).toBe(createdWorkflow.cleanupPolicy);
    expect(endResult.completionCriteria).toEqual(createdWorkflow.completionCriteria);
    expect(endResult.description).toBe(createdWorkflow.description);
  });

  it('create a new workflow and check that the right tasks get scheduled when the worker registers after the workflow was created and then be able to work through the DAG based on task dependencies', async () => {
    const response = await request(app.getHttpServer())
      .post('/workflows')
      .send({
        version: 1,
        workflow: {
          name: 'test-workflow',
          desription: 'A test workflow',
          tasks: [
            {
              name: 'task-1',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-1']
            },
            {
              name: 'task-2',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-2'],
              dependencies: [
                {
                  type: 'task',
                  id: 'task-1',
                }
              ]
            }
          ],
          completionCriteria: [
            {
              type: 'task',
              id: 'task-2'
            }
          ],
          cleanupPolicy: "after 1 day"
        },
      })
      .expect(201);

    const createdWorkflow = response.body as SendWorkflowDto;

    // register worker to receive messages
    await worker.sendHeartbeat();
    console.log('Sent heartbeat to register worker');

    const message = await worker.receiveTask();
    const dag: DAGDto = createdWorkflow.dag;
    expect(dag).toBeDefined();
    expect(dag.nodes).toHaveLength(2);
    expect(dag.nodes[0].id).toBe('w-test-workflow-t-0');
    expect(dag.nodes[1].id).toContain('w-test-workflow-t-1');
    expect(dag.nodes[0].edges).toHaveLength(1);
    expect(dag.nodes[1].edges).toHaveLength(1);

    expect(message).toBeDefined();
    expect(message.id).toBe('w-test-workflow-t-0');
    expect(message.name).toBe('task-1');
    expect(message.parameters).toEqual({ message: 'Hello World!' });
    expect(message.results).toEqual(['result-1']);
    console.log('Received and validated message and DAG');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-0');
    console.log('Sent message to simulate start of execution of first task');

    // Send a message to simulate the completion of the first task
    await worker.sendTaskProcessingCompleted('w-test-workflow-t-0');
    console.log('Sent message to simulate completion of first task');

    // Check that the second task is scheduled
    const message2 = await worker.receiveTask();
    expect(message2).toBeDefined();
    expect(message2.id).toBe('w-test-workflow-t-1');
    expect(message2.name).toBe('task-2');
    expect(message2.parameters).toEqual({ message: 'Hello World!' });
    console.log('Received and validated message for second task');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-1');
    console.log('Sent message to simulate start of execution of second task');

    // Send a message to simulate the completion of the second task
    await worker.sendTaskProcessingCompleted('w-test-workflow-t-1');
    console.log('Sent message to simulate completion of second task');

    // wait to give the backend time to process the messages
    await new Promise((r) => setTimeout(r, 500));

    const workflowEndResult = await request(app.getHttpServer())
      .get(`/workflows/${response.body.id}?includeDAG=true`)
      .expect(200);

    const endResult = workflowEndResult.body as SendWorkflowDto;
    expect(endResult).toBeDefined();
    expect(endResult.status).toBe('succeeded');
    expect(endResult.dag).toBeDefined();
    expect(endResult.dag.nodes).toHaveLength(2);
    expect(endResult.dag.nodes[0].status).toBe('succeeded');
    expect(endResult.dag.nodes[1].status).toBe('succeeded');
    expect(endResult.id).toBe(createdWorkflow.id);
    expect(endResult.name).toBe(createdWorkflow.name);
    expect(endResult.tasks).toEqual(createdWorkflow.tasks);
    expect(endResult.cleanupPolicy).toBe(createdWorkflow.cleanupPolicy);
    expect(endResult.completionCriteria).toEqual(createdWorkflow.completionCriteria);
    expect(endResult.description).toBe(createdWorkflow.description);
  });

  it('should create a workflow and traverse it using artifact dependencies', async () => {
    worker.sendHeartbeat();
    console.log('Sent heartbeat to register worker');

    const response = await request(app.getHttpServer())
      .post('/workflows')
      .send({
        version: 1,
        workflow: {
          name: 'test-workflow',
          desription: 'A test workflow',
          tasks: [
            {
              name: 'task-1',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-1'],
              completionCriteria: [
                {
                  type: 'artifact',
                  id: 'result-1',
                }
              ]
            },
            {
              name: 'task-2',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-2'],
              dependencies: [
                {
                  type: 'artifact',
                  id: 'result-1',
                }
              ],
              completionCriteria: [
                {
                  type: 'artifact',
                  id: 'result-2',
                }
              ]
            }
          ],
          completionCriteria: [
            {
              type: 'artifact',
              id: 'result-2'
            }
          ],
          cleanupPolicy: "after 1 day"
        },
      })
      .expect(201);

    const message = await worker.receiveTask();
    const createdWorkflow = response.body as SendWorkflowDto;

    const dag: DAGDto = createdWorkflow.dag;
    expect(dag).toBeDefined();
    expect(dag.nodes).toHaveLength(2);
    expect(dag.nodes[0].id).toBe('w-test-workflow-t-0');
    expect(dag.nodes[1].id).toContain('w-test-workflow-t-1');
    expect(dag.nodes[0].edges).toHaveLength(1);
    expect(dag.nodes[1].edges).toHaveLength(1);

    expect(message).toBeDefined();
    expect(message.id).toBe('w-test-workflow-t-0');
    expect(message.name).toBe('task-1');
    expect(message.parameters).toEqual({ message: 'Hello World!' });
    expect(message.results).toEqual(['result-1']);
    console.log('Received and validated message and DAG');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-0');
    console.log('Sent message to simulate start of execution of first task');

    // Send a message to simulate the upload of the first artifact
    await worker.sendArtifactUploaded('w-test-workflow-t-0', 'result-1');
    console.log('Sent message to simulate completion of first artifact');

    // Check that the second task is scheduled
    const message2 = await worker.receiveTask();
    expect(message2).toBeDefined();
    expect(message2.id).toBe('w-test-workflow-t-1');
    expect(message2.name).toBe('task-2');
    expect(message2.parameters).toEqual({ message: 'Hello World!' });
    console.log('Received and validated message for second task');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-1');
    console.log('Sent message to simulate start of execution of second task');

    // Send a message to simulate the completion of the second task
    await worker.sendArtifactUploaded('w-test-workflow-t-1', 'result-2');
    console.log('Sent message to simulate upload of second artifact');

    // wait to give the backend time to process the messages
    await new Promise((r) => setTimeout(r, 500));

    const workflowEndResult = await request(app.getHttpServer())
      .get(`/workflows/${response.body.id}?includeDAG=true`)
      .expect(200);

    const endResult = workflowEndResult.body as SendWorkflowDto;
    expect(endResult).toBeDefined();
    expect(endResult.status).toBe('succeeded');
    expect(endResult.dag).toBeDefined();
    expect(endResult.dag.nodes).toHaveLength(2);
    expect(endResult.dag.nodes[0].status).toBe('succeeded');
    expect(endResult.dag.nodes[1].status).toBe('succeeded');
    expect(endResult.id).toBe(createdWorkflow.id);
    expect(endResult.name).toBe(createdWorkflow.name);
    expect(endResult.tasks).toEqual(createdWorkflow.tasks);
    expect(endResult.cleanupPolicy).toBe(createdWorkflow.cleanupPolicy);
    expect(endResult.completionCriteria).toEqual(createdWorkflow.completionCriteria);
    expect(endResult.description).toBe(createdWorkflow.description);
  });

  it('should create a workflow and traverse it using artifact dependencies and reschedule the first task once', async () => {
    worker.sendHeartbeat();
    console.log('Sent heartbeat to register worker');

    const response = await request(app.getHttpServer())
      .post('/workflows')
      .send({
        version: 1,
        workflow: {
          name: 'test-workflow',
          desription: 'A test workflow',
          tasks: [
            {
              name: 'task-1',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-1'],
              completionCriteria: [
                {
                  type: 'artifact',
                  id: 'result-1',
                }
              ],
              retryPolicy: {
                maxRetryCount: 1,
              }
            },
            {
              name: 'task-2',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-2'],
              dependencies: [
                {
                  type: 'artifact',
                  id: 'result-1',
                }
              ],
              completionCriteria: [
                {
                  type: 'artifact',
                  id: 'result-2',
                }
              ]
            }
          ],
          completionCriteria: [
            {
              type: 'artifact',
              id: 'result-2'
            }
          ],
          cleanupPolicy: "after 1 day"
        },
      })
      .expect(201);

    const message = await worker.receiveTask();
    const createdWorkflow = response.body as SendWorkflowDto;

    const dag: DAGDto = createdWorkflow.dag;
    expect(dag).toBeDefined();
    expect(dag.nodes).toHaveLength(2);
    expect(dag.nodes[0].id).toBe('w-test-workflow-t-0');
    expect(dag.nodes[1].id).toContain('w-test-workflow-t-1');
    expect(dag.nodes[0].edges).toHaveLength(1);
    expect(dag.nodes[1].edges).toHaveLength(1);

    expect(message).toBeDefined();
    expect(message.id).toBe('w-test-workflow-t-0');
    expect(message.name).toBe('task-1');
    expect(message.parameters).toEqual({ message: 'Hello World!' });
    expect(message.results).toEqual(['result-1']);
    console.log('Received and validated message and DAG');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-0');
    console.log('Sent message to simulate execution start of first task');

    // Send a message to simulate the failure of the first task
    await worker.sendTaskProcessingFailed('w-test-workflow-t-0');
    console.log('Sent message to simulate fail of first task');

    // Check that the first task is rescheduled
    const message2 = await worker.receiveTask();
    expect(message2).toBeDefined();
    expect(message2.id).toBe('w-test-workflow-t-0');
    expect(message2.name).toBe('task-1');
    expect(message2.parameters).toEqual({ message: 'Hello World!' });
    expect(message2.results).toEqual(['result-1']);

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-0');
    console.log('Sent message to simulate execution start of first task');

    // Send a message to simulate the upload of the first artifact
    await worker.sendArtifactUploaded('w-test-workflow-t-0', 'result-1');
    console.log('Sent message to simulate completion of first artifact');

    // Check that the second task is scheduled
    const message3 = await worker.receiveTask();
    expect(message3).toBeDefined();
    expect(message3.id).toBe('w-test-workflow-t-1');
    expect(message3.name).toBe('task-2');
    expect(message3.parameters).toEqual({ message: 'Hello World!' });
    console.log('Received and validated message for second task');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-1');
    console.log('Sent message to simulate start of execution of second task');

    // Send a message to simulate the completion of the second task
    await worker.sendArtifactUploaded('w-test-workflow-t-1', 'result-2');
    console.log('Sent message to simulate completion of second artifact');

    // wait to give the backend time to process the messages
    await new Promise((r) => setTimeout(r, 500));

    const workflowEndResult = await request(app.getHttpServer())
      .get(`/workflows/${response.body.id}?includeDAG=true`)
      .expect(200);

    const endResult = workflowEndResult.body as SendWorkflowDto;
    expect(endResult).toBeDefined();
    expect(endResult.status).toBe('succeeded');
    expect(endResult.dag).toBeDefined();
    expect(endResult.dag.nodes).toHaveLength(2);
    expect(endResult.dag.nodes[0].status).toBe('succeeded');
    expect(endResult.dag.nodes[1].status).toBe('succeeded');
    expect(endResult.id).toBe(createdWorkflow.id);
    expect(endResult.name).toBe(createdWorkflow.name);
    expect(endResult.tasks).toEqual(createdWorkflow.tasks);
    expect(endResult.cleanupPolicy).toBe(createdWorkflow.cleanupPolicy);
    expect(endResult.completionCriteria).toEqual(createdWorkflow.completionCriteria);
    expect(endResult.description).toBe(createdWorkflow.description);
  })

  it('should create a workflow and cancel all tasks once the first task has failed twice', async () => {
    worker.sendHeartbeat();
    console.log('Sent heartbeat to register worker');

    const response = await request(app.getHttpServer())
      .post('/workflows')
      .send({
        version: 1,
        workflow: {
          name: 'test-workflow',
          desription: 'A test workflow',
          tasks: [
            {
              name: 'task-1',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-1'],
              completionCriteria: [
                {
                  type: 'artifact',
                  id: 'result-1',
                }
              ],
              retryPolicy: {
                maxRetryCount: 1,
              }
            },
            {
              name: 'task-2',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-2'],
              dependencies: [
                {
                  type: 'artifact',
                  id: 'result-1',
                }
              ],
              completionCriteria: [
                {
                  type: 'artifact',
                  id: 'result-2',
                }
              ]
            }
          ],
          completionCriteria: [
            {
              type: 'artifact',
              id: 'result-2'
            }
          ],
          cleanupPolicy: "after 1 day"
        },
      })
      .expect(201);

    const message = await worker.receiveTask();
    const createdWorkflow = response.body as SendWorkflowDto;

    const dag: DAGDto = createdWorkflow.dag;
    expect(dag).toBeDefined();
    expect(dag.nodes).toHaveLength(2);
    expect(dag.nodes[0].id).toBe('w-test-workflow-t-0');
    expect(dag.nodes[1].id).toContain('w-test-workflow-t-1');
    expect(dag.nodes[0].edges).toHaveLength(1);
    expect(dag.nodes[1].edges).toHaveLength(1);

    expect(message).toBeDefined();
    expect(message.id).toBe('w-test-workflow-t-0');
    expect(message.name).toBe('task-1');
    expect(message.parameters).toEqual({ message: 'Hello World!' });
    expect(message.results).toEqual(['result-1']);
    console.log('Received and validated message and DAG');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-0');
    console.log('Sent message to simulate execution start of first task');

    // Send a message to simulate the failure of the first task
    await worker.sendTaskProcessingFailed('w-test-workflow-t-0');
    console.log('Sent message to simulate fail of first task');

    // Check that the first task is rescheduled
    const message2 = await worker.receiveTask();
    expect(message2).toBeDefined();
    expect(message2.id).toBe('w-test-workflow-t-0');
    expect(message2.name).toBe('task-1');
    expect(message2.parameters).toEqual({ message: 'Hello World!' });
    expect(message2.results).toEqual(['result-1']);



    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-0');
    console.log('Sent message to simulate execution start of first task');

    // Send a message to simulate the failure of the first task
    await worker.sendTaskProcessingFailed('w-test-workflow-t-0');
    console.log('Sent message to simulate fail of first task');

    // wait to give the backend time to process the messages
    await new Promise((r) => setTimeout(r, 500));

    const workflowEndResult = await request(app.getHttpServer())
      .get(`/workflows/${response.body.id}?includeDAG=true`)
      .expect(200);

    const endResult = workflowEndResult.body as SendWorkflowDto;
    expect(endResult).toBeDefined();
    expect(endResult.status).toBe('failed');
    expect(endResult.dag).toBeDefined();
    expect(endResult.dag.nodes).toHaveLength(2);
    expect(endResult.dag.nodes[0].status).toBe('failed');
    expect(endResult.dag.nodes[1].status).toBe('canceled');
    expect(endResult.id).toBe(createdWorkflow.id);
    expect(endResult.name).toBe(createdWorkflow.name);
    expect(endResult.tasks).toEqual(createdWorkflow.tasks);
    expect(endResult.cleanupPolicy).toBe(createdWorkflow.cleanupPolicy);
    expect(endResult.completionCriteria).toEqual(createdWorkflow.completionCriteria);
    expect(endResult.description).toBe(createdWorkflow.description);
  })

  it('should return the second task when asked for a hold and then traverse the dag normaly.', async () => {
    worker.sendHeartbeat();
    console.log('Sent heartbeat to register worker');

    const response = await request(app.getHttpServer())
      .post('/workflows')
      .send({
        version: 1,
        workflow: {
          name: 'test-workflow',
          desription: 'A test workflow',
          tasks: [
            {
              name: 'task-1',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-1'],
              completionCriteria: [
                {
                  type: 'artifact',
                  id: 'result-1',
                }
              ]
            },
            {
              name: 'task-2',
              description: 'A test task',
              parameters: { message: 'Hello World!' },
              results: ['result-2'],
              dependencies: [
                {
                  type: 'artifact',
                  id: 'result-1',
                }
              ],
              completionCriteria: [
                {
                  type: 'artifact',
                  id: 'result-2',
                }
              ]
            }
          ],
          completionCriteria: [
            {
              type: 'artifact',
              id: 'result-2'
            }
          ],
          cleanupPolicy: "after 1 day"
        },
      })
      .expect(201);

    const message = await worker.receiveTask();
    const createdWorkflow = response.body as SendWorkflowDto;

    const dag: DAGDto = createdWorkflow.dag;
    expect(dag).toBeDefined();
    expect(dag.nodes).toHaveLength(2);
    expect(dag.nodes[0].id).toBe('w-test-workflow-t-0');
    expect(dag.nodes[1].id).toContain('w-test-workflow-t-1');
    expect(dag.nodes[0].edges).toHaveLength(1);
    expect(dag.nodes[1].edges).toHaveLength(1);

    expect(message).toBeDefined();
    expect(message.id).toBe('w-test-workflow-t-0');
    expect(message.name).toBe('task-1');
    expect(message.parameters).toEqual({ message: 'Hello World!' });
    expect(message.results).toEqual(['result-1']);
    console.log('Received and validated message and DAG');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-0');
    console.log('Sent message to simulate start of execution of first task');

    // Send a message to request a hold
    await worker.sendTaskHoldRequest('test-worker');
    console.log('Sent message to request hold');

    const holdResponse = await worker.receiveTaskHoldRequest();
    expect(holdResponse).toBeDefined();
    expect(holdResponse.immediateArtifacts).toHaveLength(0);
    expect(holdResponse.persistentArtifacts).toHaveLength(1);
    expect(holdResponse.persistentArtifacts[0]).toBe('result-1');

    // Send a message to simulate the upload of the first artifact
    await worker.sendArtifactUploaded('w-test-workflow-t-0', 'result-1');
    console.log('Sent message to simulate completion of first artifact');

    // Check that the second task is scheduled
    const message2 = await worker.receiveTask();
    expect(message2).toBeDefined();
    expect(message2.id).toBe('w-test-workflow-t-1');
    expect(message2.name).toBe('task-2');
    expect(message2.parameters).toEqual({ message: 'Hello World!' });
    console.log('Received and validated message for second task');

    // Send a message to simulate the start of the first task
    await worker.sendTaskProcessingStarted('w-test-workflow-t-1');
    console.log('Sent message to simulate start of execution of second task');

    // Send a message to simulate the completion of the second task
    await worker.sendArtifactUploaded('w-test-workflow-t-1', 'result-2');
    console.log('Sent message to simulate upload of second artifact');

    // wait to give the backend time to process the messages
    await new Promise((r) => setTimeout(r, 500));

    const workflowEndResult = await request(app.getHttpServer())
      .get(`/workflows/${response.body.id}?includeDAG=true`)
      .expect(200);

    const endResult = workflowEndResult.body as SendWorkflowDto;
    expect(endResult).toBeDefined();
    expect(endResult.status).toBe('succeeded');
    expect(endResult.dag).toBeDefined();
    expect(endResult.dag.nodes).toHaveLength(2);
    expect(endResult.dag.nodes[0].status).toBe('succeeded');
    expect(endResult.dag.nodes[1].status).toBe('succeeded');
    expect(endResult.id).toBe(createdWorkflow.id);
    expect(endResult.name).toBe(createdWorkflow.name);
    expect(endResult.tasks).toEqual(createdWorkflow.tasks);
    expect(endResult.cleanupPolicy).toBe(createdWorkflow.cleanupPolicy);
    expect(endResult.completionCriteria).toEqual(createdWorkflow.completionCriteria);
    expect(endResult.description).toBe(createdWorkflow.description);
  });
});
