import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { S3Path } from "../../types/s3Path.type";
import { IsString, MaxLength, MinLength } from "class-validator";
import { Exclude } from "class-transformer";
import { FileMetadata, FileMetadataSchema } from "./file-metadata.entity";
import { RegisteredUploadId } from "../../upload/entities/upload.entity";

@Schema()
export class WorkspaceFile {

  constructor(partial: WorkspaceFile) {
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

  @Exclude()
  @Prop()
  s3Path: S3Path;

  @Prop({
    type: FileMetadataSchema
  })
  metadata?: FileMetadata;
}

export const WorkspaceFileSchema = SchemaFactory.createForClass(WorkspaceFile);