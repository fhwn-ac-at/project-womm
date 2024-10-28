import { Expose } from "class-transformer";
import { IsEnum } from "class-validator";

export enum ErrorHandlingAction {
  retry = 'retry',
  escalate = 'escalate',
  error = 'error'
}

export class ErrorHandling {
  @IsEnum(ErrorHandlingAction)
  action: ErrorHandlingAction = ErrorHandlingAction.error;
}