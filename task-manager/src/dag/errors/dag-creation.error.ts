import { BadRequestException, InternalServerErrorException } from "@nestjs/common";


export class DagCreationError extends InternalServerErrorException {

  constructor(message: string) {
    super(`Error during DAG creation: ${message}`);
  }

}
