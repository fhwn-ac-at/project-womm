import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkflowsModule } from './workflows/workflows.module';
import { DagModule } from './dag/dag.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [WorkflowsModule, DagModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
