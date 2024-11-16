import { IsString, MaxLength, MinLength, Matches, IsArray, ValidateNested, IsNumber, Min, Max, IsOptional } from "class-validator";
import { CompletionCriteria, CompletionCriteriaSchema } from "./completion-criteria.entity";
import { Dependency, DependencySchema } from "./dependency.entity";
import { RetryPolicy, RetryPolicySchema } from "./retry-policy.entity";
import { ErrorHandling, ErrorHandlingSchema } from "./error-handling.entity";
import { Expose, Type } from "class-transformer";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";

@Schema()
export class Task {

  public constructor(partial?: Partial<Task>) {
    Object.assign(this, partial);
  }

  @IsString()
  @MaxLength(64)
  @MinLength(2)
  @Matches(/^[a-zA-Z_\-\d]+$/)
  @Prop()
  name: string;

  @IsArray()
  @ValidateNested({
    each: true
  })
  @Type(() => Dependency)
  @Prop({
    type: [DependencySchema]
  })
  dependencies: Dependency[] = [];

  @Prop({
    type: mongoose.Schema.Types.Mixed
  })
  parameters: any = {};

  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @MinLength(2, { each: true })
  @Matches(/^[a-zA-Z_\-\d]+$/, { each: true })
  @Prop([String])
  results: string[] = []

  @IsNumber()
  @Min(0)
  @Max(10000)
  @Prop()
  priority: number = 500;

  @ValidateNested()
  @Type(() => RetryPolicy)
  @Prop({
    type: RetryPolicySchema
  })
  retryPolicy: RetryPolicy = new RetryPolicy();

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Prop()
  timeout: number = 0;

  @ValidateNested()
  @Type(() => ErrorHandling)
  @Prop({
    type: ErrorHandlingSchema
  })
  onError: ErrorHandling = new ErrorHandling;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletionCriteria)
  @Prop({
    type: [CompletionCriteriaSchema]
  })
  completionCriteria: CompletionCriteria[] = []
}

export const TaskSchema = SchemaFactory.createForClass(Task);