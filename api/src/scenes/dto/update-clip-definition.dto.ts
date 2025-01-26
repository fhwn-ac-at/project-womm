import { PickType } from "@nestjs/mapped-types";
import { CreateClipDefinitionDto } from "./create-clip-definition.dto";


export class UpdateClipDefinitionDto extends PickType(CreateClipDefinitionDto, ['name'] as const) {
}
