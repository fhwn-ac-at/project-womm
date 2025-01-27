import { IsString, MaxLength, MinLength, Matches, IsOptional, IsArray, ValidateNested } from "class-validator";
import { CompletionCriteriaDto as CompletionCriteriaDto } from "./completion-criteria.dto";
import { TaskDto } from "./task.dto";
import { Type } from "class-transformer";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Mongoose } from "mongoose";

export class CreateWorkflowDefinitionDto {

  constructor(partial: Partial<CreateWorkflowDefinitionDto>) {
    Object.assign(this, partial);
  }

  name: string;

  description: string;

  tasks: TaskDto[] = [];

  completionCriteria: CompletionCriteriaDto[] = [];

  cleanupPolicy: string;
}
