import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueuedTask } from './entities/queued-task.entity';
import { Model } from 'mongoose';
import { DagNode } from '../dag/entities/dag-node.entity';
import { NotFoundError } from 'rxjs';

@Injectable()
export class TaskQueueService {

  private readonly logger = new Logger(TaskQueueService.name);

  public constructor(
    @InjectModel(QueuedTask.name)
    private readonly queuedTaskModel: Model<QueuedTask>
  ) { }


  public async enqueueNode(node: DagNode): Promise<QueuedTask> {
    const task = await this.queuedTaskModel.create({
      nodeId: node.id,
      task: node.task,
      addedAt: new Date()
    });

    this.logger.log(`Task ${node.task.name} of node ${task.nodeId} enqueued`);

    return task;
  }

  public async dequeue(): Promise<QueuedTask> {
    const task = await this.queuedTaskModel.findOneAndDelete().sort({ 'task.priority': 1, addedAt: 1 });

    if (!task) {
      throw new NotFoundException('No tasks in queue');
    }

    this.logger.log(`Task ${task.task.name} of node ${task.nodeId} dequeued`);

    return task;
  }

}
