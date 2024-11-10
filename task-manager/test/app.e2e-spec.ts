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
import { getOneMessageFrom } from './helpers';
import { ReadPacket, Transport } from '@nestjs/microservices';
import { SendWorkflowDto } from '../src/workflows/dto/send-workflow.dto';
import { internalBootstrap } from '../src/bootstrapper';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mongoClient: MongoClient;
  let connection: amqp.Connection;
  let channel: amqp.Channel;
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
    channel.assertQueue('tasks');
    channel.assertQueue('task_events');
    channel.assertQueue('artifact_events');

    app = moduleFixture.createNestApplication();

    internalBootstrap(app);

    app.startAllMicroservices();
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
    await channel.deleteQueue('tasks');
    await channel.deleteQueue('task_events');
    await channel.deleteQueue('artifact_events');
    await channel.close();

    await app.close();
  });

  afterAll(async () => {
    await mongoClient.close();
    await connection.close();
  });

  it('create a new workflow and check that the right tasks get scheduled and then be able to work through the DAG based on task dependencies (e2e)', async () => {
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

    const message = await getOneMessageFrom<ReadPacket<ScheduledTaskDto>>(connection, 'tasks');

    const dag: DAGDto = createdWorkflow.dag;
    expect(dag).toBeDefined();
    expect(dag.nodes).toHaveLength(2);
    expect(dag.nodes[0].id).toBe('w-test-workflow-t-0');
    expect(dag.nodes[1].id).toContain('w-test-workflow-t-1');
    expect(dag.nodes[0].edges).toHaveLength(1);
    expect(dag.nodes[1].edges).toHaveLength(1);

    expect(message).toBeDefined();
    expect(message.data.id).toBe('w-test-workflow-t-0');
    expect(message.data.name).toBe('task-1');
    expect(message.data.parameters).toEqual({ message: 'Hello World!' });
    expect(message.data.results).toEqual(['result-1']);
    console.log('Received and validated message and DAG');

    // Send a message to simulate the start of the first task
    await channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_started',
      data: {
        taskId: 'w-test-workflow-t-0',
        worker: 'test-worker',
      }
    }), 'utf-8'));
    console.log('Sent message to simulate start of execution of first task');

    // Send a message to simulate the completion of the first task
    await channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_completed',
      data: {
        taskId: 'w-test-workflow-t-0',
        worker: 'test-worker',
      }
    }), 'utf-8'));
    console.log('Sent message to simulate completion of first task');

    // Check that the second task is scheduled
    const message2 = await getOneMessageFrom<ReadPacket<ScheduledTaskDto>>(connection, 'tasks');
    expect(message2).toBeDefined();
    expect(message2.data.id).toBe('w-test-workflow-t-1');
    expect(message2.data.name).toBe('task-2');
    expect(message2.data.parameters).toEqual({ message: 'Hello World!' });
    console.log('Received and validated message for second task');

    // Send a message to simulate the start of the first task
    await channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_started',
      data: {
        taskId: 'w-test-workflow-t-1',
        worker: 'test-worker',
      }
    }), 'utf-8'));
    console.log('Sent message to simulate start of execution of second task');

    // Send a message to simulate the completion of the second task
    await channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_completed',
      data: {
        taskId: 'w-test-workflow-t-1',
        worker: 'test-worker',
      }
    }), 'utf-8'));
    console.log('Sent message to simulate completion of second task');

    // wait to give the backend time to process the messages
    await new Promise((r) => setTimeout(r, 2000));

    const workflowEndResult = await request(app.getHttpServer())
      .get(`/workflows/${response.body.id}?includeDAG=true`)
      .expect(200);

    const endResult = workflowEndResult.body as SendWorkflowDto;
    expect(endResult).toBeDefined();
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

    const message = await getOneMessageFrom<ReadPacket<ScheduledTaskDto>>(connection, 'tasks');
    const createdWorkflow = response.body as SendWorkflowDto;

    const dag: DAGDto = createdWorkflow.dag;
    expect(dag).toBeDefined();
    expect(dag.nodes).toHaveLength(2);
    expect(dag.nodes[0].id).toBe('w-test-workflow-t-0');
    expect(dag.nodes[1].id).toContain('w-test-workflow-t-1');
    expect(dag.nodes[0].edges).toHaveLength(1);
    expect(dag.nodes[1].edges).toHaveLength(1);

    expect(message).toBeDefined();
    expect(message.data.id).toBe('w-test-workflow-t-0');
    expect(message.data.name).toBe('task-1');
    expect(message.data.parameters).toEqual({ message: 'Hello World!' });
    expect(message.data.results).toEqual(['result-1']);
    console.log('Received and validated message and DAG');

    // Send a message to simulate the start of the first task
    await channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_started',
      data: {
        taskId: 'w-test-workflow-t-0',
        worker: 'test-worker',
      }
    }), 'utf-8'));

    // Send a message to simulate the upload of the first artifact
    await channel.sendToQueue('artifact_events', Buffer.from(JSON.stringify({
      pattern: 'artifact_uploaded',
      data: {
        taskId: 'w-test-workflow-t-0',
        artifactId: 'result-1',
      }
    }), 'utf-8'));
    console.log('Sent message to simulate completion of first artifact');

    // Check that the second task is scheduled
    const message2 = await getOneMessageFrom<ReadPacket<ScheduledTaskDto>>(connection, 'tasks');
    expect(message2).toBeDefined();
    expect(message2.data.id).toBe('w-test-workflow-t-1');
    expect(message2.data.name).toBe('task-2');
    expect(message2.data.parameters).toEqual({ message: 'Hello World!' });
    console.log('Received and validated message for second task');

    // Send a message to simulate the start of the first task
    await channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_started',
      data: {
        taskId: 'w-test-workflow-t-1',
        worker: 'test-worker',
      }
    }), 'utf-8'));

    // Send a message to simulate the completion of the second task
    await channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'artifact_uploaded',
      data: {
        taskId: 'w-test-workflow-t-1',
        artifactId: 'result-2',
      }
    }), 'utf-8'));
    console.log('Sent message to simulate completion of second artifact');

    // wait to give the backend time to process the messages
    await new Promise((r) => setTimeout(r, 2000));

    const workflowEndResult = await request(app.getHttpServer())
      .get(`/workflows/${response.body.id}?includeDAG=true`)
      .expect(200);

    const endResult = workflowEndResult.body as SendWorkflowDto;
    expect(endResult).toBeDefined();
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

});
