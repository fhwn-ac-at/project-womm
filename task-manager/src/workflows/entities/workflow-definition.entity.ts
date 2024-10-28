import { IsString, MaxLength, MinLength, Matches, IsOptional, IsArray, ValidateNested } from "class-validator";
import { CompletionCriteria } from "./completion-criteria.entity";
import { Task } from "./task.entity";
import { Type } from "class-transformer";

export class WorkflowDefinition {

  @IsString()
  @MaxLength(64)
  @MinLength(2)
  @Matches(/^[a-zA-Z_\-\d]+$/)
  name: string;

  @IsString()
  @MaxLength(10240)
  @IsOptional()
  description: string;

  @IsArray()
  @ValidateNested({
    each: true
  })
  @Type(() => Task)
  tasks: Task[] = [];

  @IsArray()
  @ValidateNested({
    each: true
  })
  @Type(() => CompletionCriteria)
  completionCriteria: CompletionCriteria[] = [];

  @IsString()
  cleanupPolicy: string;
}
