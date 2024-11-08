import { CreateWorkflowDefinition, WorkflowDefinitionSchema } from "../../workflows/entities/create-workflow-definition.entity";
import { DagNodeDto, DagNodeDtoSchema } from "./dag-node.dto";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DAGId } from "../entities/dag.entity";

@Schema()
export class DAGDto {
  @Prop([DagNodeDtoSchema])
  nodes: DagNodeDto[];

  @Prop()
  id: DAGId;

  @Prop()
  workflowDefinitionId: string;
}


export const DAGDtoSchema = SchemaFactory.createForClass(DAGDto);