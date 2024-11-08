import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'task_events',
      queueOptions: {
        durable: true
      }
    }
  });

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'artifact_events',
      queueOptions: {
        durable: true
      }
    }
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: {
      exposeDefaultValues: true,
    }
  }));
  app.startAllMicroservices();
  app.listen(3000);
}
bootstrap();
