import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DagNodeId } from "../../dag/entities/dag-node.entity";
import { QueuedTask, QueuedTaskSchema } from "../../task-queue/entities/queued-task.entity";
import { SchemaTypes } from "mongoose";

export enum TaskWorkerStatus {
  Stale = 'stale',
  Online = 'online',
}

@Schema()
export class TaskWorker {

  @Prop()
  name: string;

  @Prop()
  listensOn: string;

  @Prop()
  lastHeartbeat: Date;

  @Prop({
    type: String,
    enum: TaskWorkerStatus
  })
  status: TaskWorkerStatus;

  @Prop()
  workingOn: DagNodeId;

  @Prop([QueuedTaskSchema])
  nodesOnHold: QueuedTask[];
}

export const TaskWorkerSchema = SchemaFactory.createForClass(TaskWorker);
