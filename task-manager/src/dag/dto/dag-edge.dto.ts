import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DependencyType } from "../../workflows/entities/dependency.entity";

@Schema()
export class DagEdgeDto {
  @Prop()
  fromId: string;

  @Prop()
  toId: string;

  @Prop({
    type: String,
    enum: DependencyType
  })
  conditionType: DependencyType;

  @Prop()
  artifactId?: string;
}


export const DagEdgeDtoSchema = SchemaFactory.createForClass(DagEdgeDto);