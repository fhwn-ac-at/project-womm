import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { ScenesService } from '../scenes/scenes.service';

@Controller('workflow')
export class WorkflowController {

  private readonly logger = new Logger(WorkflowController.name);

  public constructor(
    private readonly scenesService: ScenesService
  ) { }

  @EventPattern('workflow_finished')
  public workflowFinished(workflowId: string) {
    this.logger.log(`Workflow ${workflowId} finished`);
    try {
      this.scenesService.finishProcessingOfWorkflow(workflowId);
    } catch (error) {
      this.logger.error(`Error while processing finished workflow ${workflowId}: ${error}`);
    }
  }

}
