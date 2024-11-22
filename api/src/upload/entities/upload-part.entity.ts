import { Schema } from "@nestjs/mongoose";

export enum RegisteredUploadPartStatus {
  Uploading = 'uploading',
  Completed = 'completed',
  Failed = 'failed'
}

@Schema()
export class RegisterdUplaodPart {

  partNumber: number;

  partSize: number;

  status: RegisterdUplaodPart;
}