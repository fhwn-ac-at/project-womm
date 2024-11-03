import { Task, TaskSchema } from "src/workflows/entities/task.entity";
import { DagEdge } from "./dag-edge.entity";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { StringExpressionOperatorReturningBoolean } from "mongoose";


export class DagNode {

  id: string;

  edges: DagEdge[] = [];

  task: Task;
}

export const DagNodeSchema = SchemaFactory.createForClass(DagNode);

