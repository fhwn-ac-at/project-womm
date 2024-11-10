import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { DagService } from '../dag/dag.service';
import { WorkflowDefinitionDto } from './dto/workflow-definition.dto';
import { CreateWorkflowDefinition } from './entities/create-workflow-definition.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { SchedulerService } from '../scheduler/scheduler.service';
import { GetWorkflowOptions } from './dto/get-workflow-options.dto';
import { SendWorkflowDto } from './dto/send-workflow.dto';
import { Task } from './entities/task.entity';
import { Dependency } from './entities/dependency.entity';
import { CompletionCriteria } from './entities/completion-criteria.entity';

@Injectable()
export class WorkflowsService {
  public constructor(
    public readonly dagService: DagService,
    @InjectModel(CreateWorkflowDefinition.name)
    private readonly workflowDefinitionModel: Model<CreateWorkflowDefinition>,
    private readonly schedulerService: SchedulerService,
  ) { }

  async create(createWorkflowDto: WorkflowDefinitionDto): Promise<SendWorkflowDto> {
    const workflow = await this.save(createWorkflowDto.workflow);
    const dag = await this.dagService.parse(workflow);
    await this.dagService.save(dag);
    await this.schedulerService.scheduleOutStandingTasks(dag);

    return this.findOne(workflow.id, { includeDAG: true });
  }

  async save(
    workflowDefinition: CreateWorkflowDefinition,
  ): Promise<WorkflowDefinition> {
    const workflowModel = new this.workflowDefinitionModel(workflowDefinition);
    const savedObj = await workflowModel.save();
    return new WorkflowDefinition({ ...workflowDefinition, id: savedObj.id });
  }

  async findOne(id: string, options: GetWorkflowOptions): Promise<SendWorkflowDto> {
    const workflow = await this.workflowDefinitionModel.findById(id);

    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${id} not found`);
    }

    const dto = this.convertCreateWorkflowDefinitionToDto(workflow, id);

    if (options.includeDAG) {
      const dag = await this.dagService.getDagOfWorkflow(dto);
      dto.dag = this.dagService.converDAGToDto(dag);
    }

    return dto;
  }

  public convertCreateWorkflowDefinitionToDto(workflow: CreateWorkflowDefinition, id: string): SendWorkflowDto {
    return new SendWorkflowDto({
      id: id,
      name: workflow.name,
      tasks: workflow.tasks.map(t => this.dagService.convertTaskToTaskDto(t)),
      cleanupPolicy: workflow.cleanupPolicy,
      completionCriteria: workflow.completionCriteria.map(c => new CompletionCriteria({
        type: c.type,
        id: c.id,
      })),
      description: workflow.description,
    });
  }
}
