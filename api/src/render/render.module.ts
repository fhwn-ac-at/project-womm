import { Module } from '@nestjs/common';
import { RenderService } from './render.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  providers: [RenderService],
  exports: [RenderService],
  imports: [WorkspacesModule, WorkflowModule]
})
export class RenderModule {}
