import { Dependency, DependencyType } from "src/workflows/entities/dependency.entity";
import { DagNode } from "./dag-node.entity";

export class DagEdge {

  from: DagNode;

  to: DagNode;

  conditionType: DependencyType;

  artifactId?: string;
}