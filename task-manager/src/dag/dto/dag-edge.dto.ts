import { DependencyType } from "src/workflows/entities/dependency.entity";


export class DagEdgeDto {
  fromId: string;

  toId: string;

  conditionType: DependencyType;

  artifactId?: string;
}