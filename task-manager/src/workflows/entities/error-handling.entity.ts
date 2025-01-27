import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Expose } from "class-transformer";
import { IsEnum } from "class-validator";

export enum ErrorHandlingAction {
  retry = 'retry',
  escalate = 'escalate',
  error = 'error'
}

@Schema()
export class ErrorHandling {

  constructor(partial?: Partial<ErrorHandling>) {
    Object.assign(this, partial);
  }

  @IsEnum(ErrorHandlingAction)
  @Prop({
    type: String,
    enum: ErrorHandlingAction
  })
  action: ErrorHandlingAction = ErrorHandlingAction.error;
}


export const ErrorHandlingSchema = SchemaFactory.createForClass(ErrorHandling);