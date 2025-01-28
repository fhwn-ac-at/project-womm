import { Prop, Schema } from "@nestjs/mongoose";
import { IsString, MinLength, MaxLength, IsNumber, Min, Max, IsEnum } from "class-validator";
import { VideoFileContainer } from "../../workspaces/entities/file-metadata.entity";
import { S3Path } from "../../types/s3Path.type";

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

  @Prop({
    required: false
  })
  _workflowId?: string;

  @Prop({
    default: false
  })
  _processingFinished: boolean = false;

  @Prop({
    required: false
  })
  _s3Key?: S3Path;

  downloadUrl?: string;
}