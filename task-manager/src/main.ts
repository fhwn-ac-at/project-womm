import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { internalBootstrap } from './bootstrapper';





async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  internalBootstrap(app);

  app.startAllMicroservices();
  app.listen(3000);
}

bootstrap();
