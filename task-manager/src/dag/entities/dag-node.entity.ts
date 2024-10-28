import { Task } from "src/workflows/entities/task.entity";
import { DagEdge } from "./dag-edge.entity";


export class DagNode {
  id: string;

  edges: DagEdge[] = [];

  task: Task;
}
