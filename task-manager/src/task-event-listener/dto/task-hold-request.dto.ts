import { IsString, MaxLength } from "class-validator";


export class TaskHoldRequestDto {
  @IsString()
  @MaxLength(100)
  worker: string;
}
