import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Transport } from "@nestjs/microservices";

export function internalBootstrap(app: INestApplication<any>) {

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: 'task_events',
      queueOptions: {
        durable: true
      }
    }
  });

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: 'workflow_control',
      queueOptions: {
        durable: true
      }
    }
  });

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: 'artifact_events',
      queueOptions: {
        durable: true
      }
    }
  });

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: 'worker_events',
      queueOptions: {
        durable: true
      }
    }
  })

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: {
      exposeDefaultValues: true,
    }
  }));
}