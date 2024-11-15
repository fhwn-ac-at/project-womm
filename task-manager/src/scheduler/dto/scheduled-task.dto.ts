import { DagNodeId } from "../../dag/entities/dag-node.entity";


export class ScheduledTaskDto {

  constructor(partial: Partial<ScheduledTaskDto>) {
    Object.assign(this, partial);
  }

  id: DagNodeId;

  name: string;

  parameters: any;

  results: string[];
}
