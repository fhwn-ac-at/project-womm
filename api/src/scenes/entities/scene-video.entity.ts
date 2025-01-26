import { Prop, Schema } from "@nestjs/mongoose";
import { IsString, MinLength, MaxLength, IsNumber, Min, Max, IsEnum } from "class-validator";
import { VideoFileContainer } from "../../workspaces/entities/file-metadata.entity";

@Schema()
export class SceneVideo {
  @Prop()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @Prop({
    type: String,
    enum: VideoFileContainer,
  })
  @IsString()
  @IsEnum(VideoFileContainer)
  container: VideoFileContainer;
}