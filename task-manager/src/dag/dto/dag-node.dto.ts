import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DagEdgeDto, DagEdgeDtoSchema } from "./dag-edge.dto";
import { Task, TaskSchema } from "src/workflows/entities/task.entity";

@Schema()
export class DagNodeDto {
  @Prop()
  id: string;

  @Prop([DagEdgeDtoSchema])
  edges: DagEdgeDto[];

  @Prop({
    type: TaskSchema
  })
  task?: Task;
}

export const DagNodeDtoSchema = SchemaFactory.createForClass(DagNodeDto);