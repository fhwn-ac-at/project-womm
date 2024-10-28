import { Expose } from "class-transformer";
import { IsBoolean, IsNumber, Max, Min } from "class-validator";

export class RetryPolicy {
  @IsNumber()
  @Min(0)
  @Max(100)
  maxRetryCount: number = 0;

  @IsNumber()
  @Min(0)
  retryDelay: number = 0;

  @IsBoolean()
  exponentialBackoff: boolean = false;
}