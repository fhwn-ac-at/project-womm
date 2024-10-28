import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { DagModule } from 'src/dag/dag.module';

@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  imports: [DagModule]
})
export class WorkflowsModule { }
