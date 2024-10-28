import { DagEdgeDto } from "./dag-edge.dto";


export class DagNodeDto {
  id: string;

  edges: DagEdgeDto[];

  taskId?: string;
}
