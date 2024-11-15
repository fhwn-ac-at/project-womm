import { IsString, MaxLength, MinLength, Matches, IsOptional, IsArray, ValidateNested } from "class-validator";
import { CompletionCriteria, CompletionCriteriaSchema } from "./completion-criteria.entity";
import { Task, TaskSchema } from "./task.entity";
import { Type } from "class-transformer";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Mongoose } from "mongoose";

export enum WorkflowStatus {
  Running = 'running',
  Failed = 'failed',
  Succeeded = 'succeeded',
}

@Schema()
export class CreateWorkflowDefinition {

  constructor(partial: Partial<CreateWorkflowDefinition>) {
    Object.assign(this, partial);
  }

  @IsString()
  @MaxLength(64)
  @MinLength(2)
  @Matches(/^[a-zA-Z_\-\d]+$/)
  @Prop()
  name: string;

  @IsString()
  @MaxLength(10240)
  @IsOptional()
  @Prop()
  description: string;

  @IsArray()
  @ValidateNested({
    each: true
  })
  @Type(() => Task)
  @Prop({
    type: [TaskSchema]
  })
  tasks: Task[] = [];

  @IsArray()
  @ValidateNested({
    each: true
  })
  @Type(() => CompletionCriteria)
  @Prop({
    type: [CompletionCriteriaSchema]
  })
  completionCriteria: CompletionCriteria[] = [];

  @IsString()
  @Prop()
  cleanupPolicy: string;

  @Prop({
    type: String,
    enum: WorkflowStatus
  })
  status: WorkflowStatus = WorkflowStatus.Running;
}

export const WorkflowDefinitionSchema = SchemaFactory.createForClass(CreateWorkflowDefinition);