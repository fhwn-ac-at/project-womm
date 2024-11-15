import { DagNodeId } from "../../dag/entities/dag-node.entity";



export class ArtifactEventDto {

  artifactId: string;

  taskId: DagNodeId;
}
