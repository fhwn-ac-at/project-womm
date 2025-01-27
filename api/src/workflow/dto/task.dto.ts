import { IsString, MaxLength, MinLength, Matches, IsArray, ValidateNested, IsNumber, Min, Max, IsOptional } from "class-validator";
import { CompletionCriteriaDto } from "./completion-criteria.dto";
import { RetryPolicyDto} from "./retry-policy.dto";
import { ErrorHandlingDto, } from "./error-handling.dto";
import { Expose, Type } from "class-transformer";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { DependencyDto } from "./dependency.dto";

export class TaskDto {

  public constructor(partial?: Partial<TaskDto>) {
    Object.assign(this, partial);
  }

  name: string;

  dependencies: DependencyDto[] = [];

  parameters: any = {};

  results: string[] = []

  priority: number = 500;

  retryPolicy: RetryPolicyDto = new RetryPolicyDto();

  timeout: number = 0;

  onError: ErrorHandlingDto = new ErrorHandlingDto;

  completionCriteria: CompletionCriteriaDto[] = []
}
