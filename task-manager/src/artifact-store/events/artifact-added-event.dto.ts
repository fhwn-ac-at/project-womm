import { DagArtifactStore } from "../../artifact-store/entities/dag-artifact-store.entity";
import { DAGId } from "../../dag/entities/dag.entity";


export class ArtifactAddedEvent {


  public constructor(init?: Partial<ArtifactAddedEvent>) {
    Object.assign(this, init);
  }

  artifactId: string;

  dagId: DAGId;

  store: DagArtifactStore;

  worker: string;

}
