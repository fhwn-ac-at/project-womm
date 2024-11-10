import { Task, TaskSchema } from "../../workflows/entities/task.entity";
import { DagEdge } from "./dag-edge.entity";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { StringExpressionOperatorReturningBoolean } from "mongoose";

export enum DagNodeStatus {
  Pending = 'pending',
  Scheduled = 'scheduled',
  Running = 'running',
  Failed = 'failed',
  Succeeded = 'succeeded',
  Canceled = 'canceled',
}

export type DagNodeId = string & { __brand: 'dag-node-id' };

export class DagNode {

  public constructor(partial?: Partial<DagNode>) {
    Object.assign(this, partial);
  }

  id: DagNodeId;

  edges: DagEdge[] = [];

  status: DagNodeStatus = DagNodeStatus.Pending;

  task: Task;

  get incommingEdges(): DagEdge[] {
    return this.edges.filter(edge => edge.to.id === this.id);
  }

  get outgoingEdges(): DagEdge[] {
    return this.edges.filter(edge => edge.from.id === this.id);
  }
}

export const DagNodeSchema = SchemaFactory.createForClass(DagNode);

