import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsArray, IsInt, IsNotEmptyObject, IsNumber, IsObject, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { SceneVideo } from "./scene-video.entity";
import { Workspace, WorkspaceId } from "../../workspaces/entities/workspace.entity";
import { Exclude, Type } from "class-transformer";
import { ClipDefinition } from "./clip-definition.entity";
import { LayerDefinition } from "./layer-definition.entity";
import { v4 as uuidv4 } from 'uuid';

export type SceneId = string & { __brand: "sceneId" };

@Schema()
export class SceneWorkspaceDefinition {
  @Prop()
  @IsString()
  @IsUUID('4')
  id: WorkspaceId;

  _workspace: Workspace;
}

@Schema()
export class Scene {

  @Prop({
    default: uuidv4
  })
  id: SceneId;

  @Min(1)
  @Max(1)
  @IsInt()
  @Prop()
  version: number = 1;

  @Prop({
    type: SceneVideo
  })
  @Type(() => SceneVideo)
  @IsObject()
  @IsNotEmptyObject()
  @ValidateNested()
  video: SceneVideo;

  @Prop({
    type: SceneWorkspaceDefinition
  })
  @Type(() => SceneWorkspaceDefinition)
  @IsObject()
  @IsNotEmptyObject()
  @ValidateNested()
  workspace: SceneWorkspaceDefinition;  

  @Prop({
    type: [ClipDefinition],
    default: []
  })
  @ValidateNested({ each: true })
  @Type(() => ClipDefinition)
  @IsArray()
  clips: ClipDefinition[] = [];

  @Prop({
    type: [LayerDefinition],
    default: []
  })
  @IsArray()
  @ValidateNested({ each: true })
  layers: LayerDefinition[] = [];
}

export const SceneSchema = SchemaFactory.createForClass(Scene);


