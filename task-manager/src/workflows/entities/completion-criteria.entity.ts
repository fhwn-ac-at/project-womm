import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Expose } from "class-transformer";
import { IsString, IsEnum, MaxLength, MinLength, Matches } from "class-validator";

export enum CompletionCriteriaType {
  task = 'task',
  artifact = 'artifact'
}

@Schema()
export class CompletionCriteria {

  constructor(partial?: Partial<CompletionCriteria>) {
    Object.assign(this, partial);
  }

  @IsString()
  @IsEnum(CompletionCriteriaType)
  @Prop({
    type: String,
    enum: CompletionCriteriaType
  })
  type: CompletionCriteriaType;

  @IsString()
  @MaxLength(64)
  @MinLength(2)
  @Matches(/^[a-zA-Z_\-\d]+$/)
  @Prop()
  id: string;
}

export const CompletionCriteriaSchema = SchemaFactory.createForClass(CompletionCriteria);