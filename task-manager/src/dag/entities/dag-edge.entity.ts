import { Dependency, DependencyType } from "src/workflows/entities/dependency.entity";
import { DagNode, DagNodeSchema } from "./dag-node.entity";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export class DagEdge {

  from: DagNode;

  to: DagNode;

  conditionType: DependencyType;

  artifactId?: string;
}

export const DagEdgeSchema = SchemaFactory.createForClass(DagEdge);