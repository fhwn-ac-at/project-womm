import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DagModule } from '../dag/dag.module';
import { ArtifactStoreModule } from '../artifact-store/artifact-store.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FunctionExecutorModule } from '../function-executor/function-executor.module';
import { WorkersModule } from '../workers/workers.module';
import { TaskQueueModule } from '../task-queue/task-queue.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  providers: [SchedulerService],
  imports: [
    DagModule,
    ArtifactStoreModule,
    FunctionExecutorModule,
    WorkersModule,
    TaskQueueModule,
    QueueModule,
  ],
  exports: [SchedulerService],
})
export class SchedulerModule { }
