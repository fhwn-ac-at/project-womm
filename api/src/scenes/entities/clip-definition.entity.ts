import { Prop, Schema } from "@nestjs/mongoose";
import { IsString, MaxLength, MinLength } from "class-validator";

export type ClipId = string & { __brand: 'ClipId' };

@Schema()
export class ClipDefinition {

  @Prop()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @Prop()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  id: ClipId;

}
