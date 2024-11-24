import { INestApplication, ValidationPipe, VersioningType } from "@nestjs/common";
import { RemoveUnderscoreFieldsInterceptor } from "./remove-underscore-fields/remove-underscore-fields.interceptor";


export async function internalBootstrap(app: INestApplication<any>) {
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI
  })

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new RemoveUnderscoreFieldsInterceptor());
}
