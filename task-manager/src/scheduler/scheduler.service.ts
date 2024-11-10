import { Inject, Injectable, InternalServerErrorException, Logger, NotImplementedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { DagNode, DagNodeId, DagNodeStatus } from '../dag/entities/dag-node.entity';
import { ScheduledTaskDto } from './dto/scheduled-task.dto';
import { DAG } from '../dag/entities/dag.entity';
import { DagService } from '../dag/dag.service';
import { RequirementsChecker } from './edge-requirement-chercker/requirements-checker';
import { ArtifactAddedEvent } from '../artifact-store/events/artifact-added-event.dto';
import { OnEvent } from '@nestjs/event-emitter';
import { ArtifactStoreService } from '../artifact-store/artifact-store.service';
import { DagArtifactStore } from '../artifact-store/entities/dag-artifact-store.entity';
import { CompletionCriteriaType } from '../workflows/entities/completion-criteria.entity';
import { FunctionExecutorModule } from '../function-executor/function-executor.module';
import { FunctionExecutorService } from '../function-executor/function-executor.service';
import { ExecutionStrategy } from '../function-executor/strategies/execution-strategy';

@Injectable()
export class SchedulerService {

  private readonly logger = new Logger(SchedulerService.name);

  private readonly executor: ExecutionStrategy;

  public constructor(
    @Inject('TasksService')
    private readonly client: ClientProxy,
    private readonly dagService: DagService,
    private readonly artifactStoreService: ArtifactStoreService,
    private readonly functionExecutorService: FunctionExecutorService
  ) {
    this.executor = this.functionExecutorService.createBuilder()
      .withRandomBackoff(b =>
        b.withMaxTries(3)
          .withBaseDelay(200)
          .withJitter(0.5)
      ).build();
  }

  public async scheduleOutStandingTasks(dag: DAG, store?: DagArtifactStore) {
    this.logger.log(`Scheduling outstanding tasks for DAG ${dag.id}`);
    if (!store) {
      this.logger.debug(`No artifact store provided. Fetching store for DAG ${dag.id}`);
      store = await this.artifactStoreService.findForDag(dag.id);
    }
    const outstanding = this.getOutstandingTasksOfDag(dag, store);

    this.logger.debug(`Found ${outstanding.length} outstanding tasks for DAG ${dag.id}`);
    for (const node of outstanding) {
      await this.scheduleDagNode(node);
    }
  }

  public async taskCompleted(nodeId: DagNodeId) {

    const dag = await this.executor.execute(() => this.dagService.markNodeAsSucceeded(nodeId));

    this.scheduleOutStandingTasks(dag);
  }

  public async taskStarted(nodeId: DagNodeId) {
    return await this.executor.execute(() => this.dagService.markNodeAsRunning(nodeId));
  }

  public async taskFailed(nodeId: DagNodeId) {
    throw new NotImplementedException();
  }

  @OnEvent('artifact.added')
  public async onArtifactUploaded(event: ArtifactAddedEvent) {
    let dag = await this.dagService.getDagById(event.dagId);
    dag = await this.updateDagNodeStati(dag, event.store);

    this.scheduleOutStandingTasks(dag, event.store);
  }

  private async scheduleDagNode(node: DagNode) {
    if (!node.task) {
      throw new InternalServerErrorException('Given node does not have a task.');
    }

    const scheduledTask = new ScheduledTaskDto({
      id: node.id,
      name: node.task.name,
      parameters: node.task.parameters,
      results: node.task.results
    });

    this.client.emit(scheduledTask.name, scheduledTask);
    await this.executor.execute(() => this.dagService.markNodeAsScheduled(node.id));
    this.logger.log(`Scheduled task ${scheduledTask.name} with id ${scheduledTask.id}`);
  }


  private async updateDagNodeStati(dag: DAG, store: DagArtifactStore): Promise<DAG> {
    this.logger.log(`Checking completion criteria for DAG ${dag.id}`);
    for (const node of dag.nodes.filter(n => n.status === DagNodeStatus.Running)) {

      if (node.task.completionCriteria.length === 0) continue;

      let metCriteria = 0;
      for (const criteria of node.task.completionCriteria) {
        if (criteria.type === CompletionCriteriaType.artifact) {
          if (store.publishedArtifacts.includes(criteria.id)) {
            metCriteria++;
          }
        } else if (criteria.type === CompletionCriteriaType.task) {
          this.logger.warn(`Task completion criteria on a task is not supported yet.`);
          metCriteria++;
        }
      }

      if (metCriteria === node.task.completionCriteria.length) {
        this.logger.log(`All completion criteria met for node ${node.id}`);
        await this.executor.execute(() => this.dagService.markNodeAsSucceeded(node.id));
        node.status = DagNodeStatus.Succeeded;
      }
    }

    return dag;
  }

  private getOutstandingTasksOfDag(dag: DAG, store: DagArtifactStore): DagNode[] {
    const executableNodes: DagNode[] = [];
    const checker = new RequirementsChecker(store);
    for (const node of dag.nodes.filter(n => n.status === DagNodeStatus.Pending)) {
      if (!this.hasOpenDependencies(node, checker)) {
        executableNodes.push(node);
      }
    }
    return executableNodes;
  }

  public hasOpenDependencies(node: DagNode, checker: RequirementsChecker): boolean {
    let metRequirements = 0;

    // Check if all requirements are met but only for the incoming edges
    for (const edge of node.incommingEdges) {
      if (checker.checkRequirements(edge)) {
        metRequirements++;
      }
    }
    this.logger.verbose(`Node ${node.id} has ${metRequirements} of ${node.incommingEdges.length} requirements met`);

    return metRequirements !== node.incommingEdges.length;
  }
}
