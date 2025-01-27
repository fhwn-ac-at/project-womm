import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Expose } from "class-transformer";
import { IsBoolean, IsNumber, Max, Min } from "class-validator";

export class RetryPolicyDto {

  constructor(partial?: Partial<RetryPolicyDto>) {
    Object.assign(this, partial);
  }

  maxRetryCount: number = 0;

  retryDelay: number = 0;

  exponentialBackoff: boolean = false;
}