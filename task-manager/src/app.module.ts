import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkflowsModule } from './workflows/workflows.module';
import { DagModule } from './dag/dag.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KnexModule } from 'nest-knexjs';
import { TasksModule } from './tasks/tasks.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    WorkflowsModule, 
    DagModule, 
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KnexModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        config: {
          client: 'pg',
          connection: {
            host: config.getOrThrow('DB_HOST'),
            user: config.getOrThrow('DB_USER'),
            password: config.getOrThrow('DB_PASSWORD'),
            database: config.getOrThrow('DB_HOST'),
            port: config.get<number>('DB_PORT', 5432)
          }, 
        },
      }),
    }),
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
