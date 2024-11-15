import { DAG } from "../../../dag/entities/dag.entity";
import { CycleDetectorStrategy } from "./cycle-detector-strategy.interface";
import { DagNode } from "../../../dag/entities/dag-node.entity";
import { CycleDetectorResponse } from "./cycle-detector-result";

export class DFSStrategy implements CycleDetectorStrategy {
  public async hasCycles(dag: DAG): Promise<CycleDetectorResponse> {
    const visited = new Set<DagNode>();
    const recursionStack = new Set<DagNode>();

    for (const node of dag.nodes) {
      if (this.isCyclic(node, visited, recursionStack)) {
        let description = "";
        let first = true;
        let firstElement = "";
        for (const n of recursionStack.entries()) {
          if (first) {
            firstElement = n[0].task.name;
            first = false;
          }
          description += `${n[0].task.name} -> `;
        }
        description += firstElement;

        return {
          hasCycle: true,
          cycleDescription: description
        };
      }
    }
    return {
      hasCycle: false
    };
  }

  private isCyclic(node: DagNode, visited: Set<DagNode>, recursionStack: Set<DagNode>): boolean {
    // If the node is already in the recursion stack, we have found a cycle
    if (recursionStack.has(node)) {
      return true;
    }

    // If the node has already been visited, skip it
    if (visited.has(node)) {
      return false;
    }

    // Mark the current node as visited and add it to the recursion stack
    visited.add(node);
    recursionStack.add(node);

    // Recur for all the nodes that are connected by outgoing edges
    for (const edge of node.edges) {
      if (edge.to === node) { // since all edges are saved inside the nodes skip the one that are pointing to the node itself.
        continue;
      }
      if (this.isCyclic(edge.to, visited, recursionStack)) {
        return true;
      }
    }

    // Remove the node from the recursion stack after visiting
    recursionStack.delete(node);
    return false;
  }
}