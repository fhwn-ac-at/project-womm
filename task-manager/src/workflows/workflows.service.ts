import { Injectable } from '@nestjs/common';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { DagService } from 'src/dag/dag.service';
import { WorkflowDefinitionDto } from './dto/workflow-definition.dto';

@Injectable()
export class WorkflowsService {

  public constructor(public readonly dagService: DagService) { }

  create(createWorkflowDto: WorkflowDefinitionDto) {
    const dag = this.dagService.parse(createWorkflowDto);
    return this.dagService.converToDto(dag);
  }

  findAll() {
    return `This action returns all workflows`;
  }

  findOne(id: number) {
    return `This action returns a #${id} workflow`;
  }

  update(id: number, updateWorkflowDto: UpdateWorkflowDto) {
    return `This action updates a #${id} workflow`;
  }

  remove(id: number) {
    return `This action removes a #${id} workflow`;
  }
}
