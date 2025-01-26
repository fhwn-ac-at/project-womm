import { ValidateNested } from "class-validator";
import { Scene } from "../entities/scene.entity";

export class CreateSceneDto {
  @ValidateNested()
  scene: Scene;
}
