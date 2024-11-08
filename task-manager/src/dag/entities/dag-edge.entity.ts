import { Dependency, DependencyType } from "../../workflows/entities/dependency.entity";
import { DagNode, DagNodeSchema } from "./dag-node.entity";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export class DagEdge {

  public constructor(partial?: Partial<DagEdge>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  from: DagNode;

  to: DagNode;

  conditionType: DependencyType;

  artifactId?: string;
}

export const DagEdgeSchema = SchemaFactory.createForClass(DagEdge);