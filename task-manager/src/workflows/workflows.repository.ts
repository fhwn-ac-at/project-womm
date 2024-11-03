import { Injectable } from '@nestjs/common';
import { WorkflowDefinition } from './entities/workflow-definition.entity';

@Injectable()
export class WorkflowsRepository {

  public async save(workflow: WorkflowDefinition) {

  }
}
