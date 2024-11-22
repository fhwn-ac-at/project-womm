import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export enum RegisteredUploadPartStatus {
  Uploading = 'uploading',
  Completed = 'completed',
  Failed = 'failed'
}

@Schema()
export class RegisterdUplaodPart {

  @Prop()
  partNumber: number;

  @Prop()
  partSize?: number;

  @Prop({
    type: String,
    enum: RegisteredUploadPartStatus,
  })
  status: RegisteredUploadPartStatus;

  @Prop()
  _ETag?: string;
}

export const RegisterdUplaodPartSchema = SchemaFactory.createForClass(RegisterdUplaodPart);