import { DagEdge } from "src/dag/entities/dag-edge.entity";


export interface EdgeRequirementsChecker {

  checkRequirements(edge: DagEdge): boolean;

}
