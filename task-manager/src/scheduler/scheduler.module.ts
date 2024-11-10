import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DagModule } from '../dag/dag.module';
import { ArtifactStoreModule } from '../artifact-store/artifact-store.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FunctionExecutorModule } from '../function-executor/function-executor.module';

@Module({
  providers: [SchedulerService],
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: 'TasksService',
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: 'tasks',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    DagModule,
    ArtifactStoreModule,
    FunctionExecutorModule,
  ],
  exports: [SchedulerService],
})
export class SchedulerModule { }
