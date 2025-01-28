import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { ScenesModule } from '../scenes/scenes.module';

@Module({
  imports: [ScenesModule],
  controllers: [WorkflowController]
})
export class WorkflowListenerModule {}
