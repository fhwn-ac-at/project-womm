import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Expose } from "class-transformer";
import { IsString, IsEnum, MaxLength, MinLength, Matches } from "class-validator";

export enum CompletionCriteriaType {
  task = 'task',
  artifact = 'artifact'
}

export class CompletionCriteriaDto {

  constructor(partial?: Partial<CompletionCriteriaDto>) {
    Object.assign(this, partial);
  }

  type: CompletionCriteriaType;

  id: string;
}