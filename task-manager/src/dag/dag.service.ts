import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DAG, DAGId } from './entities/dag.entity';
import { Task } from '../workflows/entities/task.entity';
import { DagNode, DagNodeId, DagNodeStatus } from './entities/dag-node.entity';
import { Dependency, DependencyType } from '../workflows/entities/dependency.entity';
import { DagCreationError } from './errors/dag-creation.error';
import { DagEdge } from './entities/dag-edge.entity';
import { DAGDto } from './dto/dag.dto';
import { DagNodeDto } from './dto/dag-node.dto';
import { DagEdgeDto } from './dto/dag-edge.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { WorkflowDefinition } from '../workflows/entities/workflow-definition.entity';
import { CycleDetectorService } from './cycle-detector/cycle-detector.service';
import { DagCycleError } from './errors/dag-cycle.error';
import { v4 as uuidv4 } from 'uuid';
import { CompletionCriteria } from '../workflows/entities/completion-criteria.entity';
import { ErrorHandling } from '../workflows/entities/error-handling.entity';
import { RetryPolicy } from '../workflows/entities/retry-policy.entity';
import { stat } from 'fs';

@Injectable()
export class DagService {

  private readonly logger = new Logger(DagService.name);

  private readonly proceedingStatuses: Map<DagNodeStatus, DagNodeStatus[]> = new Map([
    [DagNodeStatus.Queued, [DagNodeStatus.Pending, DagNodeStatus.Failed]],
    [DagNodeStatus.Running, [DagNodeStatus.Queued]],
    [DagNodeStatus.Succeeded, [DagNodeStatus.Running]],
    // is allowed to go from canceled. since we first cancel all outstanding tassk on error and then set the error ont the right node
    [DagNodeStatus.Failed, [DagNodeStatus.Running, DagNodeStatus.Canceled]],
    [DagNodeStatus.Canceled, [DagNodeStatus.Pending]],
  ]);

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
      workflowDefinitionId: definition.id,
      id: uuidv4() as DAGId
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
      dto.status = n.status;
      dto.retryCount = n.retryCount;
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
    dto.id = dag.id;
    dto.workflowDefinitionId = dag.workflowDefinitionId;
    return dto;
  }

  public convertDtoToDAG(dto: DAGDto): DAG {
    const nodes: DagNode[] = dto.nodes.map(nd => {
      const node = new DagNode();
      node.edges = []
      node.id = nd.id;
      node.task = this.convertTaskToTaskDto(nd.task);
      node.status = nd.status;
      node.retryCount = nd.retryCount;
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
    dag.id = dto.id;
    dag.workflowDefinitionId = dto.workflowDefinitionId;
    return dag;
  }

  public convertTaskToTaskDto(task: Task): Task {
    return new Task({
      name: task.name,
      parameters: task.parameters,
      results: task.results,
      dependencies: task.dependencies.map(d => new Dependency({
        id: d.id,
        type: d.type
      })),
      completionCriteria: task.completionCriteria.map(c => new CompletionCriteria({
        id: c.id,
        type: c.type
      })),
      onError: new ErrorHandling({
        action: task.onError.action,
      }),
      priority: task.priority,
      retryPolicy: new RetryPolicy({
        exponentialBackoff: task.retryPolicy.exponentialBackoff,
        maxRetryCount: task.retryPolicy.maxRetryCount,
        retryDelay: task.retryPolicy.retryDelay,
      }),
      timeout: task.timeout,
    });
  }

  public async save(dag: DAG, session?: ClientSession) {
    const dagDto = this.converDAGToDto(dag);
    const dagModel = new this.dagDtoModel(dagDto);

    await dagModel.save({ session });
  }

  public async startTransaction(): Promise<ClientSession> {
    const session = await this.dagDtoModel.startSession();
    session.startTransaction();
    return session;
  }

  public async getDagWithNodeId(nodeId: DagNodeId, session?: ClientSession): Promise<DAG> {
    const dagDto = await this.dagDtoModel.findOne({
      nodes: {
        $elemMatch: {
          id: nodeId
        }
      },
    }, undefined, { session });

    if (!dagDto) {
      throw new NotFoundException(`DAG containing a node of id ${nodeId} not found.`);
    }

    return this.convertDtoToDAG(dagDto);
  }

  public async findAll(session?: ClientSession): Promise<DAG[]> {
    const dagDtos = await this.dagDtoModel.find({}, undefined, { session });

    return dagDtos.map(d => this.convertDtoToDAG(d));
  }

  public async getDagById(dagId: DAGId, session?: ClientSession): Promise<DAG> {
    const dagDto = await this.dagDtoModel.findOne({
      id: dagId,
      session
    });

    return this.convertDtoToDAG(dagDto);
  }

  public async getDagOfWorkflow(workflow: WorkflowDefinition, session?: ClientSession): Promise<DAG> {
    const dagDto = await this.dagDtoModel.findOne({
      workflowDefinitionId: workflow.id,
      session
    });

    return this.convertDtoToDAG(dagDto);
  }

  public async markNodeAsSucceeded(nodeId: DagNodeId, session?: ClientSession): Promise<DAG> {
    return this.setNodeStatus(nodeId, DagNodeStatus.Succeeded, session);
  }

  public async markNodeAsRunning(nodeId: DagNodeId, session?: ClientSession): Promise<DAG> {
    return this.setNodeStatus(nodeId, DagNodeStatus.Running, session);
  }

  public async markNodeAsCanceled(nodeId: DagNodeId, session?: ClientSession): Promise<DAG> {
    return this.setNodeStatus(nodeId, DagNodeStatus.Canceled, session);
  }

  public async markNodeAsQueued(nodeId: DagNodeId, session?: ClientSession): Promise<DAG> {
    return this.setNodeStatus(nodeId, DagNodeStatus.Queued, session);
  }

  public async setNodeStatus(nodeId: DagNodeId, status: DagNodeStatus, session?: ClientSession): Promise<DAG> {
    const proceedingStatuses = this.proceedingStatuses.get(status);
    this.logger.verbose(`Marking node as ${status}. NodeId: ${nodeId} if in status: ${proceedingStatuses}`);
    const dag = await this.dagDtoModel.findOneAndUpdate({
      nodes: {
        $elemMatch: {
          id: nodeId,
          status: {
            $in: proceedingStatuses
          }
        }
      },
    }, {
      $set: {
        "nodes.$.status": status
      }
    }, { session, new: true });

    if (!dag) {
      throw new NotFoundException(`Node with id ${nodeId} not found or in an invalid state to be marked as ${status}`);
    }

    this.logger.debug(`Marked node as ${status}. NodeId: ${nodeId}`);
    return this.convertDtoToDAG(dag);
  }

  public async cancelAllPendingTasksOf(dagId: DAGId, session?: ClientSession): Promise<DAG> {
    const dag = await this.dagDtoModel.findOneAndUpdate({
      id: dagId,
      nodes: {
        $elemMatch: {
          status: DagNodeStatus.Pending
        }
      }
    }, {
      $set: {
        "nodes.$.status": DagNodeStatus.Canceled
      }
    }, { session, new: true });

    return this.convertDtoToDAG(dag);
  }

  public async increaseRetryCountOfNodeAndSetStatusFailed(nodeId: DagNodeId, session?: ClientSession): Promise<DAG> {
    const preconditionStatuses = this.proceedingStatuses.get(DagNodeStatus.Failed);
    this.logger.verbose(`Increasing retry count of node with id ${nodeId} if in status: ${preconditionStatuses}`);
    const dag = await this.dagDtoModel.findOneAndUpdate({
      nodes: {
        $elemMatch: {
          id: nodeId,
          status: {
            $in: preconditionStatuses
          }
        }
      }
    }, {
      $inc: {
        "nodes.$.retryCount": 1
      },
      $set: {
        "nodes.$.status": DagNodeStatus.Failed
      }
    }, { session, new: true });

    if (!dag) {
      throw new NotFoundException(`Node with id ${nodeId} not found or in an invalid state to be marked as failed`);
    }

    this.logger.debug(`Marked node as failed and increased retry count. NodeId: w-test-workflow-t-1`);
    return this.convertDtoToDAG(dag);
  }

  private convertTaskToDagNode(task: Task, nodeId: DagNodeId): DagNode {
    const node = new DagNode();
    node.id = nodeId;
    node.task = task;

    return node;
  }


}
