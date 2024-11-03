import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsEnum, IsString, MaxLength, MinLength, Matches } from "class-validator";

export enum DependencyType {
  task = 'task',
  artifact = 'artifact'
}

@Schema()
export class Dependency {
  @IsEnum(DependencyType)
  @Prop({
    type: String,
    enum: DependencyType
  })
  type: DependencyType;

  @IsString()
  @MaxLength(64)
  @MinLength(2)
  @Matches(/^[a-zA-Z_\-\d]+$/)
  @Prop()
  id: string;
}


export const DependencySchema = SchemaFactory.createForClass(Dependency);