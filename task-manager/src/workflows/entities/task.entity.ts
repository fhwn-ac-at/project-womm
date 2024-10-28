import { IsString, MaxLength, MinLength, Matches, IsArray, ValidateNested, IsNumber, Min, Max, IsOptional } from "class-validator";
import { CompletionCriteria } from "./completion-criteria.entity";
import { Dependency } from "./dependency.entity";
import { RetryPolicy } from "./retry-policy.entity";
import { ErrorHandling } from "./error-handling.entity";
import { Expose, Type } from "class-transformer";


export class Task {
  @IsString()
  @MaxLength(64)
  @MinLength(2)
  @Matches(/^[a-zA-Z_\-\d]+$/)
  name: string;

  @IsArray()
  @ValidateNested({
    each: true
  })
  @Type(() => Dependency)
  dependencies: Dependency[] = [];

  parameters: any = {};

  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @MinLength(2, { each: true })
  @Matches(/^[a-zA-Z_\-\d]+$/, { each: true })
  results: string[] = []

  @IsNumber()
  @Min(0)
  @Max(10000)
  priority: number = 500;

  @ValidateNested()
  @Type(() => RetryPolicy)
  retryPolicy: RetryPolicy = new RetryPolicy();

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeout: number = 0;

  @ValidateNested()
  @Type(() => ErrorHandling)
  onError: ErrorHandling = new ErrorHandling;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletionCriteria)
  completionCriteria: CompletionCriteria[] = []
}

