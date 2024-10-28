import { exec } from "child_process";
import { DagNode } from "./dag-node.entity";

export class DAG {
  nodes: DagNode[];

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