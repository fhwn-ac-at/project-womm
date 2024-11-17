import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DagNodeId } from "../../dag/entities/dag-node.entity";
import { Task, TaskSchema } from "../../workflows/entities/task.entity";

@Schema()
export class QueuedTask {

  constructor(partial?: Partial<QueuedTask>) {
    Object.assign(this, partial);
  }

  @Prop()
  nodeId: DagNodeId;

  @Prop({
    type: TaskSchema
  })
  task: Task;

  @Prop()
  addedAt: Date;
}

export const QueuedTaskSchema = SchemaFactory.createForClass(QueuedTask);
