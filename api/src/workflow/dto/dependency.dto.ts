import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsEnum, IsString, MaxLength, MinLength, Matches } from "class-validator";

export enum DependencyType {
  task = 'task',
  artifact = 'artifact'
}

export class DependencyDto {

  constructor(partial?: Partial<DependencyDto>) {
    Object.assign(this, partial);
  }

  type: DependencyType;

  id: string;
}