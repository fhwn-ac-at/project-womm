import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DagEdgeDto, DagEdgeDtoSchema } from "./dag-edge.dto";
import { Task, TaskSchema } from "../../workflows/entities/task.entity";
import { DagNodeId, DagNodeStatus } from "../entities/dag-node.entity";

@Schema()
export class DagNodeDto {
  @Prop()
  id: DagNodeId;

  @Prop([DagEdgeDtoSchema])
  edges: DagEdgeDto[];

  @Prop({
    type: TaskSchema
  })
  task?: Task;

  @Prop({
    type: String,
    enum: DagNodeStatus
  })
  status: DagNodeStatus;

}

export const DagNodeDtoSchema = SchemaFactory.createForClass(DagNodeDto);