import { ConflictException, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException, NotImplementedException } from '@nestjs/common';
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
import { QueueService } from '../queue/queue.service';
import { DependencyType } from '../workflows/entities/dependency.entity';
import { PrefetchCommandDto } from './dto/prefetch-command.dto';

@Injectable()
export class SchedulerService {

  private readonly logger = new Logger(SchedulerService.name);

  private readonly executor: ExecutionStrategy;

  public constructor(
    private readonly dagService: DagService,
    private readonly artifactStoreService: ArtifactStoreService,
    private readonly functionExecutorService: FunctionExecutorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly taskQueueService: TaskQueueService,
    private readonly workersService: WorkersService,
    private readonly queueService: QueueService,
  ) {
    this.executor = this.functionExecutorService.createBuilder()
      .withRandomBackoff(b =>
        b.withMaxTries(3)
          .withBaseDelay(50)
          .withJitter(0.5)
      ).build();
  }

  public async queueOutStandingTasks(dag: DAG, store?: DagArtifactStore) {
    this.logger.log(`Queuing outstanding tasks for DAG ${dag.id}`);
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

    await this.queueOutStandingTasks(dag);

    this.eventEmitter.emit('dag.node.completed', { dag, nodeId });

    this.scheduleTaskForWorkerWorkingOnNode(nodeId);
  }

  public async taskStarted(nodeId: DagNodeId) {
    return await this.executor.execute(() => this.dagService.markNodeAsRunning(nodeId));
  }

  public async taskHoldRequested(workerName: string): Promise<void> {
    const worker = await this.workersService.getWorker(workerName);
    if (!worker) {
      throw new NotFoundException(`Worker ${workerName} not found`);
    }
    if (worker.status !== TaskWorkerStatus.Online) {
      throw new ConflictException(`Worker ${workerName} is not online`);
    }
    if (worker.nodesOnHold.length > 0) {
      throw new ConflictException(`Worker ${workerName} already has a task on hold`);
    }

    // get dag of the node that the worker is currently working on 
    const dag = await this.dagService.getDagWithNodeId(worker.workingOn);
    const workingOnNode = dag.nodes.find(n => n.id === worker.workingOn);

    let nextNode: QueuedTask;
    try {
      nextNode = await this.executor.execute<QueuedTask>(() => this.putTaskOnHoldFor(worker, dag));

    } catch (e) {
      this.logger.warn(`Could not put task on hold for worker ${workerName}`, e);
      return;
    }

    // return the artifact IDs that need to be prefetched by the worker
    const allArtifacts = nextNode.task.dependencies.filter(dep => dep.type === DependencyType.artifact).map(dep => dep.id);
    const command = new PrefetchCommandDto({
      immediateArtifacts: allArtifacts.filter(a => !workingOnNode.task.results.includes(a)),
      persistentArtifacts: allArtifacts.filter(a => workingOnNode.task.results.includes(a))
    });

    this.logger.log(`Sending prefetch command to worker ${workerName}`);
    await this.queueService.emit(worker.listensOn, 'prefetch', command);
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

    await this.queueDagNode(node);
    await this.workersService.clearWorkOfWorkerWorkingOn(nodeId);
    // we schedule the tasks for all free workers to give the failed task a chance to be picked up by another worker
    await this.scheduleTasksForAllFreeWorkers();
    return dag;
  }

  @OnEvent('artifact.added')
  public async onArtifactUploaded(event: ArtifactAddedEvent) {
    let originDag = await this.dagService.getDagById(event.dagId);
    const { dag, completedNodes } = await this.updateDagNodeStati(originDag, event.store);

    await this.queueOutStandingTasks(dag, event.store);
    for (const node of completedNodes) {
      this.scheduleTaskForWorkerWorkingOnNode(node.id);
    }
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

  @OnEvent('worker.noWork')
  public async scheduleTaskForFreeWorker(worker: TaskWorker) {
    this.logger.log(`Worker ${worker.name} has no work, scheduling tasks`);
    const nextNodeToSchedule = await this.getNextQueuedTaskToScheduleFor(worker);
    if (!nextNodeToSchedule) {
      this.logger.debug(`No tasks to schedule for worker ${worker.name}`);
      return;
    }

    if (!await this.scheduleTaskForWorker(worker, nextNodeToSchedule)) {
      this.logger.warn(`Could not schedule task for worker ${worker.name}. Requeueing task.`);
      const dag = await this.dagService.getDagWithNodeId(nextNodeToSchedule.nodeId);
      this.taskQueueService.enqueueNode(dag.nodes.find(n => n.id === nextNodeToSchedule.nodeId)); // requeue task
    }
  }

  public async scheduleTasksForAllFreeWorkers() {
    this.logger.log('Scheduling tasks for all free workers');
    const workers = await this.workersService.findFreeWorkers();
    for (const worker of workers) {
      this.scheduleTaskForFreeWorker(worker);
    }
  }

  private async queueDagNode(node: DagNode) {
    if (!node.task) {
      throw new InternalServerErrorException('Given node does not have a task.');
    }

    await this.executor.execute(() => this.dagService.markNodeAsQueued(node.id));

    await this.taskQueueService.enqueueNode(node);
  }

  private async updateDagNodeStati(dag: DAG, store: DagArtifactStore): Promise<{ dag: DAG, completedNodes: DagNode[] }> {
    this.logger.log(`Checking completion criteria for DAG ${dag.id}`);
    const completedNodes = [];
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
        try {
          await this.executor.execute(() => this.dagService.markNodeAsSucceeded(node.id));
          completedNodes.push(node);
        } catch (e) {
          this.logger.warn(`Could not mark node ${node.id} as succeeded`, e);
          continue;
        }
        node.status = DagNodeStatus.Succeeded;
      }
    }

    return { dag, completedNodes };
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
      await this.workersService.clearWorkOfWorker(worker.name);
      return;
    }

    await this.scheduleTaskForWorker(worker, nextTask, true);
  }

  private async scheduleTaskForWorker(worker: TaskWorker, task: QueuedTask, force: boolean = false): Promise<boolean> {
    try {
      await this.workersService.updateWorkOfWorker(worker.name, task.nodeId, force);
    } catch (e) {
      if (e instanceof ConflictException) {
        this.logger.warn(`Worker ${worker.name} is already working on a task`);
        return false;
      }
      this.logger.error(`Error scheduling work for worker ${worker.name}`, e);
      return false;
    }

    const scheduledTask = new ScheduledTaskDto({
      id: task.nodeId,
      name: task.task.name,
      parameters: task.task.parameters,
      results: task.task.results
    });

    await this.queueService.emit(worker.listensOn, scheduledTask.name, scheduledTask);
    this.logger.log(`Scheduled task ${scheduledTask.name} with id ${scheduledTask.id} on worker ${worker.name}`);
    return true;
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

  private async putTaskOnHoldFor(worker: TaskWorker, dag: DAG): Promise<QueuedTask> {
    const workerName = worker.name;
    const workingOnNode = dag.nodes.find(n => n.id === worker.workingOn);
    const preferedNodes = await this.getTasksThatWouldGetScheduledIfNodeGetsCompleted(dag, workingOnNode);

    let nextNode: QueuedTask;
    if (preferedNodes.length === 0) {
      this.logger.warn(`No optimal task found to put on hold for ${workerName}. Putting next node in line on hold.`);
      nextNode = await this.taskQueueService.dequeue();
    } else {
      nextNode = new QueuedTask({
        addedAt: new Date(),
        nodeId: preferedNodes[0].id,
        task: preferedNodes[0].task
      });
    }

    // if this fails the task has been asigned to another worker in the meantime so we dont need to requeue it
    await this.dagService.markNodeAsOnHold(nextNode.nodeId);
    // this part cannot fail. If two task managers add a task to the queue the worker will just have two
    await this.workersService.addTaskToWorkerHold(workerName, nextNode);

    return nextNode;
  }

  private async getTasksThatWouldGetScheduledIfNodeGetsCompleted(dag: DAG, node: DagNode): Promise<DagNode[]> {
    const artifactStore = await this.artifactStoreService.findForDag(dag.id);
    for (const result of node.task.results) {
      artifactStore.publishedArtifacts.push(result);
    }
    node.status = DagNodeStatus.Succeeded;

    return this.getOutstandingTasksOfDag(dag, artifactStore);
  }

}
