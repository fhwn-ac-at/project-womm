import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DagNodeId } from "../../dag/entities/dag-node.entity";
import { QueuedTask } from "../../task-queue/entities/queued-task.entity";
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

  @Prop({ type: [SchemaTypes.ObjectId], ref: QueuedTask.name })
  nodesOnHold: QueuedTask[];
}

export const TaskWorkerSchema = SchemaFactory.createForClass(TaskWorker);
