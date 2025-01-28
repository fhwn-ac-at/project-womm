import { INestApplication, ValidationPipe, VersioningType } from "@nestjs/common";
import { RemoveUnderscoreFieldsInterceptor } from "./remove-underscore-fields/remove-underscore-fields.interceptor";
import { ContentNegotiationMiddleware } from "./content-negotiation/content-negotiation.middleware";
import helmet from "helmet";


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

  app.use(new ContentNegotiationMiddleware().use);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new RemoveUnderscoreFieldsInterceptor());
}
