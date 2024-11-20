import { INestApplication, ValidationPipe } from "@nestjs/common";


export async function internalBootstrap(app: INestApplication<any>) {
  app.useGlobalPipes(new ValidationPipe());
}
