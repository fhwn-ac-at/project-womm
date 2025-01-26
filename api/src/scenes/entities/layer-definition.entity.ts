import { Prop, Schema } from "@nestjs/mongoose";
import { Clip } from "./clip.entity";
import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

@Schema()
export class LayerDefinition {
  @Prop({
    type: [Clip],
    default: []
  })
  @IsArray()
  @Type(() => Clip)
  @ValidateNested({ each: true })
  clips: Clip[] = [];
}