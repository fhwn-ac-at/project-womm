import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { S3Path } from "../../types/s3Path.type";
import { Exclude } from "class-transformer";
import { v4 as uuidv4 } from 'uuid';
import { UplaodPartDto } from "../dto/upload-part.dto";
import { RegisterdUplaodPart, RegisterdUplaodPartSchema } from "./upload-part.entity";


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
  _s3UploadId?: string;

  /**
   * The expected size of the file in bytes.
   */
  @Prop()
  expectedSize: number;

  @Prop({
    default: 0
  })
  uploadedSize: number = 0;

  @Prop({
    default: [],
    type: [RegisterdUplaodPartSchema]
  })
  parts: RegisterdUplaodPart[] = [];

  maxPartSize: number;
}

export const RegisteredUploadSchema = SchemaFactory.createForClass(RegisteredUpload);
