import { Prop, Schema } from "@nestjs/mongoose";
import { IsNumber, Max, Min } from "class-validator";


@Schema()
export class CutOperation {

  @Prop()
  @IsNumber()
  @Min(0)
  @Max(60 * 60 * 24)
  from: number;

  @Prop()
  @IsNumber()
  @Min(0)
  @Max(60 * 60 * 24)
  to: number;
}
