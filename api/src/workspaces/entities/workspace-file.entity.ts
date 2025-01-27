import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { S3Path } from "../../types/s3Path.type";
import { IsString, MaxLength, MinLength } from "class-validator";
import { Exclude, Expose } from "class-transformer";
import { FileMetadata, FileMetadataSchema } from "./file-metadata.entity";
import { RegisteredUploadId } from "../../upload/entities/upload.entity";

@Schema()
export class WorkspaceFile {

  constructor(partial: Partial<WorkspaceFile>) {
    Object.assign(this, partial);
  }

  @IsString()
  @MaxLength(255)
  @Prop()
  name: string;

  @Prop()
  uploadId: RegisteredUploadId;

  @Prop()
  uploadedAt?: Date;

  @Prop({
    required: false,
    type: Date,
  })
  uploadFinishedAt?: Date;

  @Prop()
  uploadFinished: boolean;

  @Prop()
  _s3Path: S3Path;

  @Prop({
    type: FileMetadataSchema
  })
  metadata?: FileMetadata;
}

export const WorkspaceFileSchema = SchemaFactory.createForClass(WorkspaceFile);