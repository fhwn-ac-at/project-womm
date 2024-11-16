import { Module } from '@nestjs/common';
import { TaskQueueService } from './task-queue.service';
import { MongooseModule } from '@nestjs/mongoose';
import { QueuedTask, QueuedTaskSchema } from './entities/queued-task.entity';

@Module({
  providers: [TaskQueueService],
  imports: [
    MongooseModule.forFeature([
      { name: QueuedTask.name, schema: QueuedTaskSchema }
    ])
  ],
  exports: [TaskQueueService]
})
export class TaskQueueModule { }
