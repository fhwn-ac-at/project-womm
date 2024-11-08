import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DagEdgeDto, DagEdgeDtoSchema } from "./dag-edge.dto";
import { Task, TaskSchema } from "../../workflows/entities/task.entity";
import { DagNodeId } from "../entities/dag-node.entity";

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
}

export const DagNodeDtoSchema = SchemaFactory.createForClass(DagNodeDto);