import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { MongoClient } from 'mongodb';
import * as amqp from 'amqplib';
import { DAGDto } from 'src/dag/dto/dag.dto';
import { ScheduledTaskDto } from 'src/scheduler/dto/scheduled-task.dto';
import exp from 'constants';
import { ExternalExceptionFilterContext } from '@nestjs/core/exceptions/external-exception-filter-context';
import { getOneMessageFrom } from './helpers';
import { ReadPacket } from '@nestjs/microservices';

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
    }).compile();
    channel = await connection.createChannel();
    channel.assertQueue('tasks');
    channel.assertQueue('task_events');

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      transformOptions: {
        exposeDefaultValues: true,
      }
    }));
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

    const message = await getOneMessageFrom<ReadPacket<ScheduledTaskDto>>(connection, 'tasks');

    const dag: DAGDto = response.body;
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

    // Send a message to simulate the completion of the second task
    await channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_completed',
      data: {
        taskId: 'w-test-workflow-t-1',
        worker: 'test-worker',
      }
    }), 'utf-8'));
    console.log('Sent message to simulate completion of second task');

    // TODO: Check that the workflow is marked as completed (TBD once the feature is implemented)
  });
});
