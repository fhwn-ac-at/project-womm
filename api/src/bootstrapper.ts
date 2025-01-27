import { INestApplication, ValidationPipe, VersioningType } from "@nestjs/common";
import { RemoveUnderscoreFieldsInterceptor } from "./remove-underscore-fields/remove-underscore-fields.interceptor";
import { ContentNegotiationMiddleware } from "./content-negotiation/content-negotiation.middleware";


export async function internalBootstrap(app: INestApplication<any>) {
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI
  })

  app.use(new ContentNegotiationMiddleware().use);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new RemoveUnderscoreFieldsInterceptor());
}
