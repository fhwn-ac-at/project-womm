import { Module } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';

@Module({
  providers: [TasksRepository]
})
export class TasksModule {}
