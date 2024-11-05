import { Injectable } from '@nestjs/common';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { DagService } from 'src/dag/dag.service';
import { WorkflowDefinitionDto } from './dto/workflow-definition.dto';
import { CreateWorkflowDefinition } from './entities/create-workflow-definition.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { SchedulerService } from 'src/scheduler/scheduler.service';

@Injectable()
export class WorkflowsService {

  public constructor(
    public readonly dagService: DagService,
    @InjectModel(CreateWorkflowDefinition.name)
    private readonly workflowDefinitionModel: Model<CreateWorkflowDefinition>,
    private readonly schedulerService: SchedulerService
  ) { }

  async create(createWorkflowDto: WorkflowDefinitionDto) {
    const workflow = await this.save(createWorkflowDto.workflow);
    const dag = await this.dagService.parse(workflow);
    await this.dagService.save(dag);
    await this.schedulerService.scheduleOutStandingTasks(dag);
    return this.dagService.converDAGToDto(dag);
  }

  async save(workflowDefinition: CreateWorkflowDefinition): Promise<WorkflowDefinition> {
    const workflowModel = new this.workflowDefinitionModel(workflowDefinition);
    const savedObj = await workflowModel.save();
    return new WorkflowDefinition({ ...workflowDefinition, id: savedObj.id });
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
