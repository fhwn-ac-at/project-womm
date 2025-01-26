import { Prop, Schema } from "@nestjs/mongoose";
import { IsNumber, Max, Min, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { Scene } from "./scene.entity";

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
