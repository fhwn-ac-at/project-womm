import { Prop, Schema } from "@nestjs/mongoose";
import { IsInt, IsNumber, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

@Schema()
export class Scene {

  @Min(1)
  @Max(1)
  @IsInt()
  @Prop()
  version: number = 1;

  @Prop()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  videoName: string;
}
