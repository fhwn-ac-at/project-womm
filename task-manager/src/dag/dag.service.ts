import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDefinitionDto } from 'src/workflows/dto/workflow-definition.dto';
import { DAG } from './entities/dag.entity';
import { Task } from 'src/workflows/entities/task.entity';
import { DagNode, DagNodeId, DagNodeStatus } from './entities/dag-node.entity';
import { DependencyType } from 'src/workflows/entities/dependency.entity';
import { DagCreationError } from './errors/dag-creation.error';
import { DagEdge } from './entities/dag-edge.entity';
import { DAGDto } from './dto/dag.dto';
import { DagNodeDto } from './dto/dag-node.dto';
import { DagEdgeDto } from './dto/dag-edge.dto';
import { CreateWorkflowDefinition } from 'src/workflows/entities/create-workflow-definition.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { workerData } from 'worker_threads';
import { expand } from 'rxjs';
import { WorkflowDefinition } from 'src/workflows/entities/workflow-definition.entity';
import { CycleDetectorService } from './cycle-detector/cycle-detector.service';
import { DagCycleError } from './errors/dag-cycle.error';

@Injectable()
export class DagService {

  private readonly logger = new Logger(DagService.name);

  public constructor(
    @InjectModel(DAGDto.name)
    private readonly dagDtoModel: Model<DAGDto>,
    private readonly cycleDetector: CycleDetectorService
  ) { }

  public async parse(definition: WorkflowDefinition): Promise<DAG> {
    const taskNodes: DagNode[] = definition.tasks.map((t, i) => this.convertTaskToDagNode(t, `w-${definition.name}-t-${i}` as DagNodeId));
    const taskMap: Map<string, DagNode> = new Map(taskNodes.map(n => [n.task.name, n]));
    const artifactMap: Map<string, DagNode> = new Map(taskNodes.flatMap(n => n.task.results.map(a => [a, n])));

    for (const node of taskNodes) {
      for (const condition of node.task.dependencies) {
        if (condition.type === DependencyType.task) {
          if (!taskMap.has(condition.id)) {
            throw new DagCreationError(`Unable to find dependency of task ${node.task.name}. Dependency: Task: ${condition.id}`);
          }

          const originatingNode = taskMap.get(condition.id);
          const edge = new DagEdge({
            from: originatingNode,
            to: node,
            conditionType: DependencyType.task
          });

          originatingNode.edges.push(edge);
          node.edges.push(edge);
        } else if (condition.type === DependencyType.artifact) {
          if (!artifactMap.has(condition.id)) {
            throw new DagCreationError(`Unable to find dependency of task ${node.task.name}. Dependency: Artifact: ${condition.id}`);
          }

          const originatingNode = artifactMap.get(condition.id);
          const edge = new DagEdge({
            from: originatingNode,
            to: node,
            conditionType: DependencyType.artifact,
            artifactId: condition.id
          });

          originatingNode.edges.push(edge);
          node.edges.push(edge);
        } else {
          throw new DagCreationError("Unable to reolsve dependency of type: " + condition.type);
        }
      }
    }

    const dag = new DAG({
      nodes: taskNodes,
      workflowDefinitionId: definition.id
    });

    const cycleDetectorResponse = await this.cycleDetector.checkForCycle(dag);
    if (cycleDetectorResponse.hasCycle) {
      throw new DagCycleError(cycleDetectorResponse);
    }

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
      const node = new DagNode();
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

  public async save(dag: DAG, session?: ClientSession) {
    const dagDto = this.converDAGToDto(dag);
    const dagModel = new this.dagDtoModel(dagDto);

    await dagModel.save({ session });
  }

  public async loadWithNodeId(nodeId: DagNodeId, session?: ClientSession): Promise<DAG> {
    // TODO: Error handling
    const dagDto = await this.dagDtoModel.findOne({
      nodes: {
        $elemMatch: {
          id: nodeId
        }
      },
      session
    });

    return this.convertDtoToDAG(dagDto);
  }

  public async markNodeAsSucceeded(nodeId: DagNodeId): Promise<DAG> {
    return this.setNodeStatus(nodeId, DagNodeStatus.Succeeded);
  }

  public async markNodeAsFailed(nodeId: DagNodeId): Promise<DAG> {
    return this.setNodeStatus(nodeId, DagNodeStatus.Failed);
  }

  public async markNodeAsRunning(nodeId: DagNodeId): Promise<DAG> {
    return this.setNodeStatus(nodeId, DagNodeStatus.Running);
  }

  public async markNodeAsScheduled(nodeId: DagNodeId): Promise<DAG> {
    return this.setNodeStatus(nodeId, DagNodeStatus.Scheduled);
  }

  public async markNodeAsCanceled(nodeId: DagNodeId): Promise<DAG> {
    return this.setNodeStatus(nodeId, DagNodeStatus.Canceled);
  }

  public async setNodeStatus(nodeId: DagNodeId, status: DagNodeStatus): Promise<DAG> {
    const session = await this.dagDtoModel.startSession();
    session.startTransaction();

    try {
      const dag = await this.loadWithNodeId(nodeId, session);
      const node = dag.nodes.find(n => n.id === nodeId);
      node.status = status;
      
      await this.save(dag, session);

      return dag;
    } catch (error) {
      this.logger.error(`Failed to mark node as succeeded. NodeId: ${nodeId}`);
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private convertTaskToDagNode(task: Task, nodeId: DagNodeId): DagNode {
    const node = new DagNode();
    node.id = nodeId;
    node.task = task;

    return node;
  }


}
