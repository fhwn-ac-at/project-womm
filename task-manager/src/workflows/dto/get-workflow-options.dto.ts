import { Optional } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsBoolean } from "class-validator";


export class GetWorkflowOptions {
  @Optional()
  @IsBoolean()
  @Transform((value) => value.value === 'true')
  includeDAG: boolean = false;
}
