import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import internal from 'stream';
import { internalBootstrap } from './bootstrapper';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await internalBootstrap(app);

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI
  })

  const config = new DocumentBuilder()
    .setTitle('WOMM API')
    .setDescription('The disributed rendering API')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
