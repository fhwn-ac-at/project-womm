import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateWorkflowDto } from './dto/create-workflow.dto';

@Injectable()
export class WorkflowService {

  public constructor(
    @Inject('WORKFLOW_SERVICE') private client: ClientProxy,
  ) {}


  public startWorkflow(workflow: CreateWorkflowDto) {
    return this.client.send('createWorkflow', workflow);
  }

}
