import { Optional } from "@nestjs/common";
import { ExecFileSyncOptionsWithBufferEncoding } from "child_process";
import { IsArray, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from "class-validator";
import { CompletionCriteria } from "../entities/completion-criteria.entity";
import { WorkflowDefinition } from "../entities/workflow-definition.entity";

export class WorkflowDefinitionDto extends WorkflowDefinition {

}



