import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WorkerHeartbeatDto } from './dto/worker-heartbeat-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TaskWorker, TaskWorkerStatus } from './entities/worker.entity';
import { DagNodeId } from '../dag/entities/dag-node.entity';
import { QueuedTask } from '../task-queue/entities/queued-task.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { emit } from 'process';

@Injectable()
export class WorkersService implements OnModuleInit {

  private readonly logger = new Logger(WorkersService.name);

  public constructor(
    @InjectModel(TaskWorker.name)
    private readonly workerModel: Model<TaskWorker>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) { }


  onModuleInit() {
    const interval = setInterval(async () => {
      await this.checkForStaleWorkers();
    }, this.configService.get<number>('WORKER_STALE_CHECK_INTERVAL', 10000))
    this.schedulerRegistry.addInterval('stale-worker-check', interval);
    this.logger.log(`Stale worker check scheduled to run every ${this.configService.get<number>('WORKER_STALE_CHECK_INTERVAL', 10000)}ms`);
  }

  public async processWorkerHeartbeat(event: WorkerHeartbeatDto) {
    const oldWorker = await this.workerModel.findOneAndUpdate({
      name: event.name
    }, {
      name: event.name,
      listensOn: event.listensOn,
      lastHeartbeat: new Date(),
      status: TaskWorkerStatus.Online
    }, {
      upsert: true,
      setDefaultsOnInsert: true,
    });

    if (!oldWorker) {
      this.logger.log(`Worker ${event.name} registered`);
      this.eventEmitter.emit('worker.noWork', await this.getWorker(event.name));
      return;
    }

    if (oldWorker.status === TaskWorkerStatus.Stale) {
      // TODO: Implemnt logic to check with the worker if he is still working on the task
      this.logger.log(`Worker ${event.name} is back online`);
      this.eventEmitter.emit('worker.noWork', await this.getWorker(event.name));
      return;
    }

    if (!oldWorker.workingOn) {
      this.eventEmitter.emit('worker.noWork', await this.getWorker(event.name));
    }
  }

  public async getWorker(name: string): Promise<TaskWorker> {
    return this.workerModel.findOne({ name });
  }

  public async findFreeWorkers(): Promise<TaskWorker[]> {
    return this.workerModel.find({
      status: TaskWorkerStatus.Online,
      workingOn: null
    });
  }

  public async findWorkerWorkingOn(nodeId: DagNodeId): Promise<TaskWorker> {
    return this.workerModel.findOne({
      workingOn: nodeId
    });
  }

  public async updateWorkOfWorker(workerName: string, taskId: DagNodeId, force: boolean = true): Promise<TaskWorker> {
    if (force) {
      return await this.workerModel.findOneAndUpdate({
        name: workerName
      }, {
        workingOn: taskId
      }, { new: true });
    }
    const worker = await this.workerModel.findOneAndUpdate({
      name: workerName,
      workingOn: {
        $exists: false
      }
    }, {
      workingOn: taskId
    }, { new: true });

    if (!worker) {
      throw new ConflictException(`Worker ${workerName} already working on a task`);
    }

    return worker;
  }

  public async clearWorkOfWorker(workerName: string): Promise<TaskWorker> {
    return this.workerModel.findOneAndUpdate({
      name: workerName
    }, {
      $unset: {
        workingOn: ''
      }
    }, { new: true });
  }

  public async addTaskToWorkerHold(workerName: string, task: QueuedTask): Promise<TaskWorker> {
    return this.workerModel.findOneAndUpdate({
      name: workerName
    }, {
      $push: {
        nodesOnHold: task
      }
    }, { new: true });
  }

  public async clearWorkOfWorkerWorkingOn(nodeId: DagNodeId): Promise<TaskWorker> {
    return this.workerModel.findOneAndUpdate({
      workingOn: nodeId
    }, {
      $unset: {
        workingOn: ''
      }
    }, { new: true });
  }

  public async unholdOneOf(worker: TaskWorker): Promise<{ worker: TaskWorker, task: QueuedTask }> {
    if (worker.nodesOnHold.length === 0) {
      throw new Error('Worker has no tasks on hold');
    }

    const queuedTask = worker.nodesOnHold.shift();
    const newWorker = await this.workerModel.findOneAndUpdate({
      name: worker.name
    }, {
      $pop: {
        nodesOnHold: -1
      }
    }, { new: true });

    return {
      worker: newWorker,
      task: queuedTask
    }
  }

  private async checkForStaleWorkers() {
    const staleThreshold = new Date(Date.now() - this.configService.get<number>('WORKER_STALE_THRESHOLD', 30000));
    const staleWorkers = await this.workerModel.find({
      lastHeartbeat: { $lt: staleThreshold }
    });
    this.logger.debug(`Found ${staleWorkers.length} stale workers`);

    for (const worker of staleWorkers) {
      const updatedWorker = await this.workerModel.findOneAndUpdate({
        name: worker.name,
        lastHeartbeat: { $lt: staleThreshold }
      }, {
        $set: {
          status: TaskWorkerStatus.Stale
        }
      });
      this.logger.verbose(`Worker ${updatedWorker.name} marked as stale`);
      this.eventEmitter.emit('worker.stale', updatedWorker);
    }


    this.logger.debug('Stale worker check completed');
  }


}
