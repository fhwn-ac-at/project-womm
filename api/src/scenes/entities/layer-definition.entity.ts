import { Prop, Schema } from "@nestjs/mongoose";
import { Clip } from "./clip.entity";
import { IsArray, ValidateNested } from "class-validator";

@Schema()
export class LayerDefinition {
  @Prop({
    type: [Clip],
    default: []
  })
  @IsArray()
  @ValidateNested({ each: true })
  clips: Clip[] = [];
}