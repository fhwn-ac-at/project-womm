import { DagEdge } from "../dag/entities/dag-edge.entity";


export interface EdgeRequirementsChecker {

  checkRequirements(edge: DagEdge): boolean;

}
