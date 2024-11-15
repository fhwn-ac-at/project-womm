import { DagNode, DagNodeStatus } from "./dag-node.entity";
import { WorkflowDefinition } from "../../workflows/entities/workflow-definition.entity";

export type DAGId = string & { __brand: "dagId" };

export class DAG {

  public constructor(partial?: Partial<DAG>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  id: DAGId;

  nodes: DagNode[];

  workflowDefinitionId: string;

  workflowDefinition?: WorkflowDefinition;
}