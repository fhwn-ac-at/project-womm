import { DagNodeId } from "../../dag/entities/dag-node.entity";


export class TaskUpdateEventDto {

  taskId: DagNodeId;

  worker: string;

}
