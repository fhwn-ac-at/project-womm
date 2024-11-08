import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
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

@Injectable()
export class SchedulerService {

  public constructor(
    @Inject('TasksService')
    private readonly client: ClientProxy,
    private readonly dagService: DagService,
    private readonly artifactStoreService: ArtifactStoreService
  ) {}

  public async scheduleOutStandingTasks(dag: DAG, store?: DagArtifactStore) {
    if (!store) {
      store = await this.artifactStoreService.findForDag(dag.id);
    }
    const outstanding = this.getOutstandingTasksOfDag(dag, store);

    for (const node of outstanding) {
      this.scheduleDagNode(node);
    }
  }

  public async taskCompleted(nodeId: DagNodeId) {
    const dag = await this.dagService.markNodeAsSucceeded(nodeId);

    this.scheduleOutStandingTasks(dag);
  }

  public async taskStarted(nodeId: DagNodeId) {
    await this.dagService.markNodeAsRunning(nodeId);
  }

  public async taskFailed(nodeId: DagNodeId) {
    // TODO: mark all nodes as canceled.
  }

  @OnEvent('artifact.added')
  public async onArtifactUploaded(event: ArtifactAddedEvent) {
    const dag = await this.dagService.getDagById(event.dagId);
    
    this.scheduleOutStandingTasks(dag, event.store);
  }

  private scheduleDagNode(node: DagNode) {
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
  }

  private getOutstandingTasksOfDag(dag: DAG, store: DagArtifactStore): DagNode[] {
    const executableNodes: DagNode[] = [];
    const checker = new RequirementsChecker(store);
    for (const node of dag.nodes) {
      if (node.status !== DagNodeStatus.Pending) {
        continue;
      }

      if (!this.hasOpenDependencies(node, checker)) {
        executableNodes.push(node);
      }
    }
    return executableNodes;
  }
  
  public hasOpenDependencies(node: DagNode, checker: RequirementsChecker): boolean {

    for (const edge of node.edges.filter(e => e.from.status !== DagNodeStatus.Succeeded)) {
      if (checker.checkRequirements(edge)) {
        return true;
      }
    }

    return false;
  }
}
