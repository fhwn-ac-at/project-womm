import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { S3Path } from "../../types/s3Path.type";
import { Exclude } from "class-transformer";
import { v4 as uuidv4 } from 'uuid';
import { UplaodPartDto } from "../dto/upload-part.dto";


export type RegisteredUploadId = string & { __brand: "registeredUploadId" };

@Schema()
export class RegisteredUpload {

  @Prop({
    default: uuidv4
  })
  uploadId: RegisteredUploadId;

  @Prop()
  _s3Path: S3Path;

  @Prop()
  _s3UploadId: string;

  /**
   * The expected size of the file in bytes.
   */
  @Prop()
  expectedSize: number;

  @Prop()
  parts: UplaodPartDto[];

  maxPartSize: number;
}

export const RegisteredUploadSchema = SchemaFactory.createForClass(RegisteredUpload);
