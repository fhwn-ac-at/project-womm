import { DAG } from "src/dag/entities/dag.entity";
import { EdgeRequirementsChecker } from "../edge-requirement-checker";
import { DagEdge } from "src/dag/entities/dag-edge.entity";
import { DagNodeStatus } from "src/dag/entities/dag-node.entity";
import { DependencyType } from "src/workflows/entities/dependency.entity";
import { InternalServerErrorException } from "@nestjs/common";


export class TaskEdgeRequirementsChecker implements EdgeRequirementsChecker {

  checkRequirements(edge: DagEdge): boolean {
    if (edge.conditionType !== DependencyType.task) {
      throw new InternalServerErrorException(`Invalid condition type ${edge.conditionType}`);
    }

    return edge.from.status === DagNodeStatus.Succeeded;
  }

}
