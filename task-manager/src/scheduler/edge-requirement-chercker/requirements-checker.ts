import { DagEdge } from "src/dag/entities/dag-edge.entity";
import { TaskEdgeRequirementsChecker } from "./strategies/task-edge-requirements-checker";
import { EdgeRequirementsChecker } from "./edge-requirement-checker";


export class RequirementsChecker implements EdgeRequirementsChecker {

  private readonly taskEdgeRequirementsChecker = new TaskEdgeRequirementsChecker();

  checkRequirements(edge: DagEdge): boolean {
    return this.taskEdgeRequirementsChecker.checkRequirements(edge);
  }

}
