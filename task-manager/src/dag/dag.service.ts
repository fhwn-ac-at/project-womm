import { Injectable } from '@nestjs/common';
import { WorkflowDefinitionDto } from 'src/workflows/dto/workflow-definition.dto';
import { DAG } from './entities/dag.entity';
import { Task } from 'src/workflows/entities/task.entity';
import { DagNode } from './entities/dag-node.entity';
import { DependencyType } from 'src/workflows/entities/dependency.entity';
import { DagCreationError } from './errors/dag-creation.error';
import { DagEdge } from './entities/dag-edge.entity';
import { DAGDto } from './dto/dag.dto';
import { DagNodeDto } from './dto/dag-node.dto';
import { DagEdgeDto } from './dto/dag-edge.dto';
import { CreateWorkflowDefinition } from 'src/workflows/entities/create-workflow-definition.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { workerData } from 'worker_threads';
import { expand } from 'rxjs';
import { WorkflowDefinition } from 'src/workflows/entities/workflow-definition.entity';

@Injectable()
export class DagService {

  public constructor(
    @InjectModel(DAGDto.name)
    private readonly dagDtoModel: Model<DAGDto>
  ) { }


  public parse(definition: WorkflowDefinition): DAG {
    const taskNodes: DagNode[] = definition.tasks.map((t, i) => this.convertTaskToDagNode(t, `w-${definition.name}-t-${i}`));
    const taskMap: Map<string, DagNode> = new Map(taskNodes.map(n => [n.task.name, n]));
    const artifactMap: Map<string, DagNode> = new Map(taskNodes.flatMap(n => n.task.results.map(a => [a, n])));

    for (const node of taskNodes) {
      for (const condition of node.task.dependencies) {
        if (condition.type === DependencyType.task) {
          if (!taskMap.has(condition.id)) {
            throw new DagCreationError(`Unable to find dependency of task ${node.task.name}. Dependency: Task: ${condition.id}`);
          }

          const originatingNode = taskMap.get(condition.id);
          const edge = new DagEdge();
          edge.from = originatingNode;
          edge.to = node;
          edge.conditionType = DependencyType.task;
          originatingNode.edges.push(edge);
          node.edges.push(edge);
        } else if (condition.type === DependencyType.artifact) {
          if (!artifactMap.has(condition.id)) {
            throw new DagCreationError(`Unable to find dependency of task ${node.task.name}. Dependency: Artifact: ${condition.id}`);
          }

          const originatingNode = artifactMap.get(condition.id);
          const edge = new DagEdge();
          edge.from = originatingNode;
          edge.to = node;
          edge.conditionType = DependencyType.artifact;
          edge.artifactId = condition.id;
          originatingNode.edges.push(edge);
          node.edges.push(edge);
        } else {
          throw new DagCreationError("Unable to reolsve dependency of type: " + condition.type);
        }
      }
    }

    //TODO: Check for cycles. If there are cycles throw an error.
    const dag = new DAG();
    dag.nodes = taskNodes;
    dag.workflowDefinitionId = definition.id;
    return dag;
  }

  public converDAGToDto(dag: DAG): DAGDto {
    var nodes = dag.nodes.map(n => {
      var dto = new DagNodeDto();
      dto.id = n.id;
      dto.task = n.task;
      dto.edges = n.edges.map(e => {
        const edto = new DagEdgeDto();
        edto.artifactId = e.artifactId;
        edto.conditionType = e.conditionType;
        edto.fromId = e.from.id;
        edto.toId = e.to.id;
        return edto;
      });
      return dto;
    })

    var dto = new DAGDto();
    dto.nodes = nodes;
    dto.workflowDefinitionId = dag.workflowDefinitionId;
    return dto;
  }

  public convertDtoToDAG(dto: DAGDto): DAG {
    const nodes: DagNode[] = dto.nodes.map(nd => {
      const node = new DagNode;
      node.edges = []
      node.id = nd.id;
      node.task = nd.task
      return node;
    });
    const nodeMap: Map<string, DagNode> = new Map(nodes.map(n => [n.id, n]));

    for (const nodeDto of dto.nodes) {
      const node = nodeMap.get(nodeDto.id);
      for (const edgeDto of nodeDto.edges) {
        const edge = new DagEdge();
        edge.artifactId = edgeDto.artifactId;
        edge.conditionType = edgeDto.conditionType;
        edge.from = nodeMap.get(edgeDto.fromId)
        edge.to = nodeMap.get(edgeDto.toId);
        node.edges.push(edge);
      }
    }

    const dag = new DAG();
    dag.nodes = nodes;
    dag.workflowDefinitionId = dto.workflowDefinitionId;
    return dag;
  }

  public async save(dag: DAG) {
    const dagDto = this.converDAGToDto(dag);
    const dagModel = new this.dagDtoModel(dagDto);

    return await dagModel.save();
  }

  private convertTaskToDagNode(task: Task, nodeId: string): DagNode {
    const node = new DagNode();
    node.id = nodeId;
    node.task = task;

    return node;
  }


}
