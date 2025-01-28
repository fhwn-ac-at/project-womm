import { INestApplication, ValidationPipe, VersioningType } from "@nestjs/common";
import { RemoveUnderscoreFieldsInterceptor } from "./remove-underscore-fields/remove-underscore-fields.interceptor";
import { ContentNegotiationMiddleware } from "./content-negotiation/content-negotiation.middleware";
import helmet from "helmet";
import { Transport } from "@nestjs/microservices";


export async function internalBootstrap(app: INestApplication<any>) {
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI
  })

  // app.enableCors();
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          mediaSrc: ["'self'", 'blob:'],
          objectSrc: ["'none'"], // Prevent embedding of objects
        },
      },
    }),
  );

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: 'workflow_updates',
      queueOptions: {
        durable: true
      },
    },
  });

  app.use(new ContentNegotiationMiddleware().use);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new RemoveUnderscoreFieldsInterceptor());
}
