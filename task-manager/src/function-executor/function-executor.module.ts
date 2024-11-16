import { Module } from '@nestjs/common';
import { FunctionExecutorService } from './function-executor.service';

@Module({
  providers: [FunctionExecutorService],
  exports: [FunctionExecutorService]
})
export class FunctionExecutorModule { }
