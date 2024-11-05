import { DagNode, DagNodeStatus } from "./dag-node.entity";
import { WorkflowDefinition } from "src/workflows/entities/workflow-definition.entity";

export class DAG {

  public constructor(partial?: Partial<DAG>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  nodes: DagNode[];

  workflowDefinitionId: string;

  workflowDefinition?: WorkflowDefinition;
}