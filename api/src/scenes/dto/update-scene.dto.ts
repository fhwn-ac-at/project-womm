import { PartialType, PickType } from '@nestjs/swagger';
import { CreateSceneDto } from './create-scene.dto';
import { Scene } from '../entities/scene.entity';
import { IsNotEmptyObject, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateScene extends PartialType(PickType(Scene, ['video'] as const)) {}

export class UpdateSceneDto {
  @ValidateNested()
  @Type(() => UpdateScene)
  @IsNotEmptyObject()
  @IsObject()
  scene?: UpdateScene
}
