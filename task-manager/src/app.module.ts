import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkflowsModule } from './workflows/workflows.module';
import { DagModule } from './dag/dag.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TaskEventListenerModule } from './task-event-listener/task-event-listener.module';
import { ArtifactStoreModule } from './artifact-store/artifact-store.module';
import { ArtifactEventListenerModule } from './artifact-event-listener/artifact-event-listener.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    WorkflowsModule,
    DagModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow("MONGO_CONNECTION"),
      }),
      imports: [ConfigModule],
      inject: [ConfigService]
    }),
    EventEmitterModule.forRoot(),
    SchedulerModule,
    TaskEventListenerModule,
    ArtifactStoreModule,
    ArtifactEventListenerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
