import { CreateWorkflowDefinition, WorkflowDefinitionSchema } from "src/workflows/entities/create-workflow-definition.entity";
import { DagNodeDto, DagNodeDtoSchema } from "./dag-node.dto";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema()
export class DAGDto {
  @Prop([DagNodeDtoSchema])
  nodes: DagNodeDto[];

  @Prop()
  workflowDefinitionId: string;
}


export const DAGDtoSchema = SchemaFactory.createForClass(DAGDto);