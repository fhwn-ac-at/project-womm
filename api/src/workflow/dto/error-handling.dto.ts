import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Expose } from "class-transformer";
import { IsEnum } from "class-validator";

export enum ErrorHandlingAction {
  retry = 'retry',
  escalate = 'escalate',
  error = 'error'
}

export class ErrorHandlingDto {

  constructor(partial?: Partial<ErrorHandlingDto>) {
    Object.assign(this, partial);
  }

  action: ErrorHandlingAction = ErrorHandlingAction.error;
}