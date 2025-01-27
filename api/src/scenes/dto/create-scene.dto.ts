import { IsNotEmptyObject, IsObject, ValidateNested } from "class-validator";
import { Scene } from "../entities/scene.entity";
import { Type } from "class-transformer";

export class CreateSceneDto {
  @ValidateNested()
  @Type(() => Scene)
  @IsNotEmptyObject()
  @IsObject()
  scene: Scene;
}
