
import * as amqp from 'amqplib';
import { getOneMessageFrom } from './helpers';
import { ReadPacket } from '@nestjs/microservices';
import { ScheduledTaskDto } from '../src/scheduler/dto/scheduled-task.dto';
import { PrefetchCommandDto } from '../src/scheduler/dto/prefetch-command.dto';

export class WorkerMock {

  public name: string;
  public listensOn: string;
  public channel: amqp.Channel;
  public connection: amqp.Connection;

  constructor(partial: Partial<WorkerMock>) {
    Object.assign(this, partial);
  }

  public async sendHeartbeat(): Promise<void> {
    await this.channel.sendToQueue('worker_events', Buffer.from(JSON.stringify({
      pattern: 'worker_heartbeat',
      data: {
        name: this.name,
        listensOn: this.listensOn,
      }
    }), 'utf-8'));
  }

  public async sendTaskProcessingStarted(taskId: string): Promise<void> {
    await this.channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_started',
      data: {
        taskId,
        worker: this.name,
      }
    }), 'utf-8'));
  }

  public async sendTaskProcessingCompleted(taskId: string): Promise<void> {
    await this.channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_completed',
      data: {
        taskId,
        worker: this.name,
      }
    }), 'utf-8'));
  }

  public async sendTaskProcessingFailed(taskId: string): Promise<void> {
    await this.channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_processing_failed',
      data: {
        taskId,
        worker: this.name,
      }
    }), 'utf-8'));
  }

  public async sendArtifactUploaded(taskId: string, artifactId: string): Promise<void> {
    await this.channel.sendToQueue('artifact_events', Buffer.from(JSON.stringify({
      pattern: 'artifact_uploaded',
      data: {
        taskId,
        artifactId,
      }
    }), 'utf-8'));
  }

  public async receiveTask(): Promise<ReadPacket<ScheduledTaskDto>> {
    return await getOneMessageFrom<ReadPacket<ScheduledTaskDto>>(this.connection, this.listensOn);
  }

  public async receiveTaskHoldRequest(): Promise<ReadPacket<PrefetchCommandDto>> {
    return await getOneMessageFrom<ReadPacket<PrefetchCommandDto>>(this.connection, this.listensOn);
  }

  public async sendTaskHoldRequest(worker: string) {
    await this.channel.sendToQueue('task_events', Buffer.from(JSON.stringify({
      pattern: 'task_hold_request',
      data: {
        worker,
      }
    }), 'utf-8'));
  }


}
