import { INestApplication, ValidationPipe } from "@nestjs/common";
import { RemoveUnderscoreFieldsInterceptor } from "./remove-underscore-fields/remove-underscore-fields.interceptor";


export async function internalBootstrap(app: INestApplication<any>) {
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new RemoveUnderscoreFieldsInterceptor());
}
