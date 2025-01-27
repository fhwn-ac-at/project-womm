import { DagEdge } from "../../../dag/entities/dag-edge.entity";
import { EdgeRequirementsChecker } from "../edge-requirement-checker";
import { DagArtifactStore } from "../../../artifact-store/entities/dag-artifact-store.entity";
import { DependencyType } from "../../../workflows/entities/dependency.entity";
import { InternalServerErrorException } from "@nestjs/common";


export class ArtifactEdgeRequirementsChecker implements EdgeRequirementsChecker {
  
  constructor(
    private readonly artifactStore: DagArtifactStore
  ) {}

  checkRequirements(edge: DagEdge): boolean {
    if (edge.conditionType !== DependencyType.artifact) {
      throw new InternalServerErrorException("Edge not of type artifact");
    }

    if (!edge.artifactId) {
      throw new InternalServerErrorException("Artifact edge does not contain an artifact id");
    }

    return this.artifactStore.publishedArtifacts.includes(edge.artifactId);
  }

}
