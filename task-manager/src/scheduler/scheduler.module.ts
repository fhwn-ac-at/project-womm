import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DagModule } from '../dag/dag.module';
import { ArtifactStoreModule } from '../artifact-store/artifact-store.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
  ],
  exports: [SchedulerService],
})
export class SchedulerModule {}
