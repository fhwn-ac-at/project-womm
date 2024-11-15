import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { internalBootstrap } from './bootstrapper';





async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  internalBootstrap(app);

  await app.startAllMicroservices();
  await app.listen(3000);
}

bootstrap();
