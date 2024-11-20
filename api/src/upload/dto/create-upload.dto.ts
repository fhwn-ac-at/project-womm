import { PickType } from "@nestjs/swagger";
import { RegisteredUpload } from "../entities/upload.entity";
import { OmitType } from "@nestjs/mapped-types";

export class CreateUploadDto extends OmitType(RegisteredUpload, ['id'] as const) { }
