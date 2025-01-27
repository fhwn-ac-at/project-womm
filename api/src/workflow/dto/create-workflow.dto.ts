import { Optional } from "@nestjs/common";
import { ExecFileSyncOptionsWithBufferEncoding } from "child_process";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Matches, MaxLength, MinLength, Validate, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateWorkflowDefinitionDto } from "./create-workflow-definition.dto";

export class CreateWorkflowDto {


  public constructor(partial?: Partial<CreateWorkflowDto>) {
    Object.assign(this, partial);
  }

  version: 1

  workflow: CreateWorkflowDefinitionDto;
}
