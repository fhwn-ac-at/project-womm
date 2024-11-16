import { Module } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskWorker, TaskWorkerSchema } from './entities/worker.entity';

@Module({
  providers: [WorkersService],
  controllers: [WorkersController],
  imports: [
    MongooseModule.forFeature([
      { name: TaskWorker.name, schema: TaskWorkerSchema }
    ]),
  ],
  exports: [WorkersService]
})
export class WorkersModule { }
