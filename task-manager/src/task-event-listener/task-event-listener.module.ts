import { Module } from '@nestjs/common';
import { TaskEventListenerController } from './task-event-listener.controller';
import { SchedulerModule } from 'src/scheduler/scheduler.module';

@Module({
  providers: [],
  controllers: [TaskEventListenerController],
  imports: [
    SchedulerModule
  ]
})
export class TaskEventListenerModule {
}
