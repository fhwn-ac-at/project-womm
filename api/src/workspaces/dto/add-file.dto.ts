import { PickType } from "@nestjs/swagger";
import { WorkspaceFile } from "../entities/workspace-file.entity";
import { IsNumber, IsPositive, Max } from "class-validator";


export class AddFileDto extends PickType(WorkspaceFile, ['name'] as const) {

  /**
   * The size of the file in bytes.
   */
  @IsNumber()
  @IsPositive()
  @Max(1024 * 1024 * 1024 * 100) // 100GB should be enough even for 4k videos
  fileSize: number;

}
