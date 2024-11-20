import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { S3Path } from "../../types/s3Path.type";
import { Exclude } from "class-transformer";
import { v4 as uuidv4 } from 'uuid';


export type RegisteredUploadId = string & { __brand: "registeredUploadId" };

@Schema()
export class RegisteredUpload {

  @Prop({
    default: uuidv4
  })
  id: RegisteredUploadId;

  @Prop()
  s3Path: S3Path;

  /**
   * The expected size of the file in bytes.
   */
  @Prop()
  expectedSize: number;

}

export const RegisteredUploadSchema = SchemaFactory.createForClass(RegisteredUpload);
