import { Prop, Schema } from "@nestjs/mongoose";
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, Validate, ValidateNested, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { CutOperation } from "./cut-operation.entity";
import { Scene } from "./scene.entity";
import { Type } from "class-transformer";

@ValidatorConstraint({ async: false })
class ClipIdExistsConstraint implements ValidatorConstraintInterface {
  validate(id: string, args: ValidationArguments) {
    const object = args.object as Scene;
    // Validate that the `id` exists in the `clips` array
    return object.clips.some((clip) => clip.id === id);
  }

  defaultMessage(args: ValidationArguments) {
    return `Clip ID ${args.value} does not exist in the clips array.`;
  }
}

@Schema()
export class Clip {
  
  @Prop()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Validate(ClipIdExistsConstraint)
  id: string;

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

  @Prop({
    type: CutOperation,
    required: false
  })
  @Type(() => CutOperation)
  @ValidateNested()
  @IsOptional()
  cut?: CutOperation;
}
