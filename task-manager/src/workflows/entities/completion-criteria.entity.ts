import { Expose } from "class-transformer";
import { IsString, IsEnum, MaxLength, MinLength, Matches } from "class-validator";

export enum CompletionCriteriaType {
  task = 'task',
  artifact = 'artifact'
}

export class CompletionCriteria {
  @IsString()
  @IsEnum(CompletionCriteriaType)
  type: CompletionCriteriaType;

  @IsString()
  @MaxLength(64)
  @MinLength(2)
  @Matches(/^[a-zA-Z_\-\d]+$/)
  id: string;
}