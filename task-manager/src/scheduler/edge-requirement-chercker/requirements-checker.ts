import { DagEdge } from "../../dag/entities/dag-edge.entity";
import { TaskEdgeRequirementsChecker } from "./strategies/task-edge-requirements-checker";
import { EdgeRequirementsChecker } from "./edge-requirement-checker";
import { DependencyType } from "../../workflows/entities/dependency.entity";
import { DagArtifactStore } from "../../artifact-store/entities/dag-artifact-store.entity";
import { ArtifactEdgeRequirementsChecker } from "./strategies/artifact-edge-requirements-checker";
import { InternalServerErrorException } from "@nestjs/common";


export class RequirementsChecker implements EdgeRequirementsChecker {


  private checkerMap: Map<DependencyType, EdgeRequirementsChecker>;

  constructor(store: DagArtifactStore) {
    this.checkerMap = new Map([
      [DependencyType.task, new TaskEdgeRequirementsChecker()],
      [DependencyType.artifact, new ArtifactEdgeRequirementsChecker(store)],
    ]);
  }

  checkRequirements(edge: DagEdge): boolean {
    if (!this.checkerMap.has(edge.conditionType)) {
      throw new InternalServerErrorException(`Edge of unknown type to check ${edge.conditionType}`);
    }

    return this.checkerMap.get(edge.conditionType).checkRequirements(edge);
  }

}
