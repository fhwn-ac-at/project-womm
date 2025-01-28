import { Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { DagService } from '../dag/dag.service';
import { WorkflowDefinitionDto } from './dto/workflow-definition.dto';
import { CreateWorkflowDefinition, WorkflowStatus } from './entities/create-workflow-definition.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { SchedulerService } from '../scheduler/scheduler.service';
import { GetWorkflowOptions } from './dto/get-workflow-options.dto';
import { SendWorkflowDto } from './dto/send-workflow.dto';
import { Task } from './entities/task.entity';
import { Dependency, DependencyType } from './entities/dependency.entity';
import { CompletionCriteria, CompletionCriteriaType } from './entities/completion-criteria.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { DAG } from '../dag/entities/dag.entity';
import { ArtifactStoreService } from '../artifact-store/artifact-store.service';
import { DagArtifactStore } from '../artifact-store/entities/dag-artifact-store.entity';
import { ArtifactAddedEvent } from '../artifact-store/events/artifact-added-event.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class WorkflowsService {

  private readonly logger = new Logger(WorkflowsService.name);

  public constructor(
    public readonly dagService: DagService,
    @InjectModel(CreateWorkflowDefinition.name)
    private readonly workflowDefinitionModel: Model<CreateWorkflowDefinition>,
    private readonly schedulerService: SchedulerService,
    private readonly artifactStoreService: ArtifactStoreService,
    @Inject('WORKFLOW_UPDATES') private workflowUpdateClient: ClientProxy,
  ) { }

  async create(createWorkflowDto: WorkflowDefinitionDto): Promise<SendWorkflowDto> {
    const workflow = await this.save(createWorkflowDto.workflow);
    const dag = await this.dagService.parse(workflow);
    await this.dagService.save(dag);
    await this.schedulerService.queueOutStandingTasks(dag);
    this.schedulerService.scheduleTasksForAllFreeWorkers();

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
      status: workflow.status,
    });
  }

  @OnEvent('dag.node.completed')
  public async onDagNodeCompleted(data: { dag: DAG, nodeId: string }) {
    if (!data.dag.workflowDefinition) {
      this.logger.debug(`No workflow definition found for dag ${data.dag.id} fetching one now`);
      data.dag.workflowDefinition = await this.workflowDefinitionModel.findById(data.dag.workflowDefinitionId);
    }
    let artifactStore = await this.artifactStoreService.findForDag(data.dag.id);

    if (!data.dag.workflowDefinition) {
      throw new NotFoundException(`No workflow definition found for dag ${data.dag.id}`);
    }

    await this.checkCompletionCriteria(data.dag, artifactStore);
  }

  @OnEvent('artifact.added')
  public async onArtifactUploaded(event: ArtifactAddedEvent) {
    const dag = await this.dagService.getDagById(event.dagId);
    dag.workflowDefinition = await this.workflowDefinitionModel.findById(dag.workflowDefinitionId);

    await this.checkCompletionCriteria(dag, event.store);
  }

  @OnEvent('dag.failed')
  public async onDagFailed(dag: DAG) {
    await this.workflowDefinitionModel.findByIdAndUpdate(dag.workflowDefinitionId, { status: WorkflowStatus.Failed });
  }

  private async checkCompletionCriteria(dag: DAG, artifactStore: DagArtifactStore) {
    if (!dag.workflowDefinition) {
      throw new InternalServerErrorException(`No workflow definition found for dag ${dag.id}`);
    }
    const workflowDef = dag.workflowDefinition;
    this.logger.log(`Checking if workflow ${workflowDef.id} is completed`);

    let criteriaMet = 0
    for (const criteria of workflowDef.completionCriteria) {
      if (criteria.type === CompletionCriteriaType.task) {
        const criteriaNode = dag.nodes.find(n => n.task.name === criteria.id);
        if (criteriaNode.status === 'succeeded') {
          criteriaMet++;
        }
      } else if (criteria.type === CompletionCriteriaType.artifact) {
        if (artifactStore.publishedArtifacts.includes(criteria.id)) {
          criteriaMet++;
        }
      }
    }
    this.logger.debug(`Criteria met: ${criteriaMet}/${workflowDef.completionCriteria.length}`);
    if (criteriaMet !== workflowDef.completionCriteria.length) {
      return;
    }

    // All criteria met
    this.logger.log(`All completion criteria met for workflow ${workflowDef.id}`);
    await this.workflowDefinitionModel.findByIdAndUpdate(workflowDef.id, { status: WorkflowStatus.Succeeded }, { new: true });

    // Send workflow update that workflow has finished.
    this.workflowUpdateClient.emit('workflow_finished', workflowDef.id);
  }
}
