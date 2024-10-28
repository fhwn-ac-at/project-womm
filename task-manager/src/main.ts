import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.connectMicroservice({
  //   options: {
  //     urls: ['amqp://localhost:5672'],
  //     queue: 'task_requests',
  //     queueOptions: {
  //       durable: true
  //     }
  //   }
  // });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: {
      exposeDefaultValues: true,

    }
  }));
  app.listen(3000);
}
bootstrap();
