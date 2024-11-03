import { Optional } from "@nestjs/common";
import { ExecFileSyncOptionsWithBufferEncoding } from "child_process";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Matches, MaxLength, MinLength, Validate, ValidateNested } from "class-validator";
import { CompletionCriteria } from "../entities/completion-criteria.entity";
import { CreateWorkflowDefinition } from "../entities/create-workflow-definition.entity";
import { Type } from "class-transformer";

export class WorkflowDefinitionDto {

  @IsNumber()
  @IsEnum([1])
  version: 1

  @ValidateNested()
  @Type(() => CreateWorkflowDefinition)
  workflow: CreateWorkflowDefinition
}



