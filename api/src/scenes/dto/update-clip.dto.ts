import { OmitType } from "@nestjs/mapped-types";
import { PartialType } from "@nestjs/swagger";
import { CreateClipDto } from "./create-clip.dto";

class PartialCreateClipDto extends PartialType(CreateClipDto) {}

export class UpdateClipDto extends OmitType(PartialCreateClipDto, ['id'] as const) {
}
