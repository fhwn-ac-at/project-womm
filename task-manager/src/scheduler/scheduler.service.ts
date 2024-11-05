import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { DagNode, DagNodeId, DagNodeStatus } from 'src/dag/entities/dag-node.entity';
import { ScheduledTaskDto } from './dto/scheduled-task.dto';
import { DAG } from 'src/dag/entities/dag.entity';
import { DagService } from 'src/dag/dag.service';
import { RequirementsChecker } from './edge-requirement-chercker/requirements-checker';

@Injectable()
export class SchedulerService {

  public constructor(
    @Inject('TasksService')
    private readonly client: ClientProxy,
    private readonly dagService: DagService
  ) {}

  public async scheduleOutStandingTasks(dag: DAG) {
    const outstanding = this.getOutstandingTasksOfDag(dag);

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

  private getOutstandingTasksOfDag(dag: DAG): DagNode[] {
    const executableNodes: DagNode[] = []
    for (const node of dag.nodes) {
      if (node.status !== DagNodeStatus.Pending) {
        continue;
      }

      if (!this.hasOpenDependencies(node)) {
        executableNodes.push(node);
      }
    }
    return executableNodes;
  }
  
  public hasOpenDependencies(node: DagNode): boolean {
    const requirementChecker = new RequirementsChecker();

    for (const edge of node.edges.filter(e => e.from.status !== DagNodeStatus.Succeeded)) {
      if (requirementChecker.checkRequirements(edge)) {
        return true;
      }
    }

    return false;
  }
}
