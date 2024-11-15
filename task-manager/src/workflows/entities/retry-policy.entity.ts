import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Expose } from "class-transformer";
import { IsBoolean, IsNumber, Max, Min } from "class-validator";

@Schema()
export class RetryPolicy {

  constructor(partial?: Partial<RetryPolicy>) {
    Object.assign(this, partial);
  }

  @IsNumber()
  @Min(0)
  @Max(100)
  @Prop()
  maxRetryCount: number = 0;

  @IsNumber()
  @Min(0)
  @Prop()
  retryDelay: number = 0;

  @IsBoolean()
  @Prop()
  exponentialBackoff: boolean = false;
}

export const RetryPolicySchema = SchemaFactory.createForClass(RetryPolicy);