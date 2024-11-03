import { DagNode } from "./dag-node.entity";
import { WorkflowDefinition } from "src/workflows/entities/workflow-definition.entity";

export class DAG {
  nodes: DagNode[];

  workflowDefinitionId: string;

  workflowDefinition?: WorkflowDefinition;

  public getExecutableNodes(): DagNode[] {
    const executableNodes: DagNode[] = []
    for (const node of this.nodes) {
      if (!this.hasOpenDependencies(node)) {
        executableNodes.push(node);
      }
    }
    return executableNodes;
  }

  public hasOpenDependencies(node: DagNode): boolean {
    for (const node of this.nodes) {
      for (const edge of node.edges) {
        if (edge.to === node) {
          return true;
        }
      }
    }

    return false;
  }
}