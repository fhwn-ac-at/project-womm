import { Injectable } from '@nestjs/common';
import { FunctionExecutorBuilder } from './function-executor-builder';

@Injectable()
export class FunctionExecutorService {


  public createBuilder(): FunctionExecutorBuilder {
    return new FunctionExecutorBuilder();
  }

}
