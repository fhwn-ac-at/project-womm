import { Prop, Schema } from "@nestjs/mongoose";
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, Validate, ValidateNested, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { CutOperation } from "./cut-operation.entity";
import { Scene } from "./scene.entity";
import { Type } from "class-transformer";
import { ClipId } from "./clip-definition.entity";

@ValidatorConstraint({ async: false })
class ClipIdExistsConstraint implements ValidatorConstraintInterface {
  validate(id: string, args: ValidationArguments) {
    if (!args.targetName.includes('Scene')) {
      return true;
    }
    
    const object = args.object as Scene;
    if (!object.clips) {
      return false;
    }
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
  id: ClipId;

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
