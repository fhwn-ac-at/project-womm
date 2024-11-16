import { DAG } from "../../../dag/entities/dag.entity";
import { EdgeRequirementsChecker } from "../edge-requirement-checker";
import { DagEdge } from "../../../dag/entities/dag-edge.entity";
import { DagNodeStatus } from "../../../dag/entities/dag-node.entity";
import { DependencyType } from "../../../workflows/entities/dependency.entity";
import { InternalServerErrorException } from "@nestjs/common";


export class TaskEdgeRequirementsChecker implements EdgeRequirementsChecker {

  checkRequirements(edge: DagEdge): boolean {
    if (edge.conditionType !== DependencyType.task) {
      throw new InternalServerErrorException(`Invalid condition type ${edge.conditionType}`);
    }

    return edge.from.status === DagNodeStatus.Succeeded;
  }

}
