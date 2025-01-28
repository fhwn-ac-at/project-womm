import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';

@Controller('workflow')
export class WorkflowController {

  @EventPattern('workflow_finished')
  public workflowFinished(workflowId: string) {
    console.log(`Workflow ${workflowId} finished`);
  }

}
