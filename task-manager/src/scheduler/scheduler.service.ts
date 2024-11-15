import { Inject, Injectable, InternalServerErrorException, Logger, NotFoundException, NotImplementedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { DagNode, DagNodeId, DagNodeStatus } from '../dag/entities/dag-node.entity';
import { ScheduledTaskDto } from './dto/scheduled-task.dto';
import { DAG } from '../dag/entities/dag.entity';
import { DagService } from '../dag/dag.service';
import { RequirementsChecker } from './edge-requirement-chercker/requirements-checker';
import { ArtifactAddedEvent } from '../artifact-store/events/artifact-added-event.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ArtifactStoreService } from '../artifact-store/artifact-store.service';
import { DagArtifactStore } from '../artifact-store/entities/dag-artifact-store.entity';
import { CompletionCriteriaType } from '../workflows/entities/completion-criteria.entity';
import { FunctionExecutorModule } from '../function-executor/function-executor.module';
import { FunctionExecutorService } from '../function-executor/function-executor.service';
import { ExecutionStrategy } from '../function-executor/strategies/execution-strategy';
import { TaskQueueService } from '../task-queue/task-queue.service';
import { WorkersService } from '../workers/workers.service';
import { TaskWorker, TaskWorkerStatus } from '../workers/entities/worker.entity';
import { NotFoundError } from 'rxjs';
import { QueuedTask } from '../task-queue/entities/queued-task.entity';
import { Task } from '../workflows/entities/task.entity';

@Injectable()
export class SchedulerService {

  private readonly logger = new Logger(SchedulerService.name);

  private readonly executor: ExecutionStrategy;

  public constructor(
    @Inject('TasksService')
    private readonly client: ClientProxy,
    private readonly dagService: DagService,
    private readonly artifactStoreService: ArtifactStoreService,
    private readonly functionExecutorService: FunctionExecutorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly taskQueueService: TaskQueueService,
    private readonly workersService: WorkersService
  ) {
    this.executor = this.functionExecutorService.createBuilder()
      .withRandomBackoff(b =>
        b.withMaxTries(3)
          .withBaseDelay(50)
          .withJitter(0.5)
      ).build();
  }

  public async queueOutStandingTasks(dag: DAG, store?: DagArtifactStore) {
    this.logger.log(`Scheduling outstanding tasks for DAG ${dag.id}`);
    if (!store) {
      this.logger.debug(`No artifact store provided. Fetching store for DAG ${dag.id}`);
      store = await this.artifactStoreService.findForDag(dag.id);
    }
    const outstanding = this.getOutstandingTasksOfDag(dag, store);

    this.logger.debug(`Found ${outstanding.length} outstanding tasks for DAG ${dag.id}`);
    for (const node of outstanding) {
      await this.queueDagNode(node);
    }
  }

  public async taskCompleted(nodeId: DagNodeId) {

    const dag = await this.executor.execute(() => this.dagService.markNodeAsSucceeded(nodeId));

    this.queueOutStandingTasks(dag);

    this.eventEmitter.emit('dag.node.completed', { dag, nodeId });

    this.scheduleTaskForWorkerWorkingOnNode(nodeId);
  }

  public async taskStarted(nodeId: DagNodeId) {
    return await this.executor.execute(() => this.dagService.markNodeAsRunning(nodeId));
  }


  public async taskFailed(nodeId: DagNodeId) {
    let dag = await this.executor.execute(() => this.dagService.increaseRetryCountOfNodeAndSetStatusFailed(nodeId));

    const node = dag.nodes.find(n => n.id === nodeId);
    if (node.retryCount > node.task.retryPolicy.maxRetryCount) {
      this.logger.warn(`Task ${nodeId} reached maximum retry count. Cancelling all pending tasks of dag ${dag.id}.`);

      const endDag = await this.dagService.cancelAllPendingTasksOf(dag.id);
      this.eventEmitter.emit('dag.failed', endDag);
      return endDag;
    }

    this.queueDagNode(node);
    return dag;
  }

  @OnEvent('artifact.added')
  public async onArtifactUploaded(event: ArtifactAddedEvent) {
    let dag = await this.dagService.getDagById(event.dagId);
    dag = await this.updateDagNodeStati(dag, event.store);

    this.queueOutStandingTasks(dag, event.store);
  }

  @OnEvent('worker.stale')
  public async onWorkerStale(worker: TaskWorker) {
    if (worker.nodesOnHold.length === 0) {
      this.logger.debug(`Worker ${worker.name} has no tasks on hold.`);
      return;
    }

    this.logger.log(`Removing all tasks on hold from stale worker`);
    await Promise.all(worker.nodesOnHold.map(async node => {
      const dag = await this.dagService.getDagWithNodeId(node.nodeId);
      await this.queueDagNode(dag.nodes.find(n => n.id === node.nodeId));
      await this.workersService.unholdOneOf(worker);
    }));
  }

  @OnEvent('worker.registered')
  public async onWorkerRegistered(worker: TaskWorker) {
    const nextNodeToSchedule = await this.getNextQueuedTaskToScheduleFor(worker);
    if (!nextNodeToSchedule) {
      this.logger.debug(`No tasks to schedule for worker ${worker.name}`);
      return;
    }

    await this.scheduleTaskForWorker(worker, nextNodeToSchedule);
  }

  private async queueDagNode(node: DagNode) {
    if (!node.task) {
      throw new InternalServerErrorException('Given node does not have a task.');
    }

    await this.taskQueueService.enqueueNode(node);

    await this.executor.execute(() => this.dagService.markNodeAsQueued(node.id));
    this.logger.log(`Queued task ${node.task.name} with id ${node.id}`);
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

  private async scheduleTaskForWorkerWorkingOnNode(nodeId: DagNodeId) {
    const worker = await this.workersService.findWorkerWorkingOn(nodeId);

    if (worker.status !== TaskWorkerStatus.Online) {
      this.logger.warn(`Worker ${worker.name} is not online. Cannot schedule task.`);
      return;
    }

    const nextTask = await this.getNextQueuedTaskToScheduleFor(worker);
    if (!nextTask) {
      this.logger.debug(`No tasks to schedule for worker ${worker.name}`);
      return;
    }

    await this.scheduleTaskForWorker(worker, nextTask);
  }

  private async scheduleTaskForWorker(worker: TaskWorker, task: QueuedTask) {
    worker.workingOn = task.nodeId;
    await this.workersService.updateWorkOfWorker(worker.name, task.nodeId);

    const scheduledTask = new ScheduledTaskDto({
      id: task.nodeId,
      name: task.task.name,
      parameters: task.task.parameters,
      results: task.task.results
    });

    this.client.emit(scheduledTask.name, scheduledTask);
    this.executor.execute(() => this.dagService.markNodeAsQueued(task.nodeId));
    this.logger.log(`Scheduled task ${scheduledTask.name} with id ${scheduledTask.id} on worker ${worker.name}`);
  }

  private async getNextQueuedTaskToScheduleFor(worker: TaskWorker): Promise<QueuedTask> {
    if (worker.nodesOnHold.length > 0) {
      // the worker has tasks on hold. Get the next node on hold and schedule it.
      return (await this.workersService.unholdOneOf(worker)).task;
    }

    try {
      return await this.taskQueueService.dequeue();
    } catch (e) {
      if (e instanceof NotFoundException) {
        this.logger.debug(`No tasks to schedule for worker ${worker.name}`);
        return;
      }
      this.logger.error('Error dequeuing task', e);
      return;
    }
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
