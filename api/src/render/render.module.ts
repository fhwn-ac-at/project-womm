import { Module } from '@nestjs/common';
import { RenderService } from './render.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  providers: [RenderService],
  exports: [RenderService],
  imports: [WorkspacesModule]
})
export class RenderModule {}
