import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { createWriteStream } from 'fs';
import { Scene, SceneId } from './entities/scene.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ScenesService {

  private logger = new Logger(ScenesService.name);
  
  public constructor(
    @InjectModel(Scene.name)
    private readonly sceneModel: Model<Scene>,
    private readonly workspaceService: WorkspacesService,
  ) {}
  
  async create(createSceneDto: CreateSceneDto) {
    const scene = createSceneDto.scene;
    const workspace = await this.workspaceService.findOne(scene.workspace.id);
    scene.workspace._workspace = workspace;

    // check that all clips used are defined in the workspace
    // this action will throw an exception if a clip is not found
    await this.validateClipAvailability(scene, true);

    const createdScene = await this.sceneModel.create(scene);
    return createdScene.toObject();
  }

  async findAll() {
    const scenes = await this.sceneModel.find().exec();
    return scenes.map((scene) => scene.toObject());
  }

  async findOne(id: SceneId) {
    const scene = await this.sceneModel.findOne({
      id: id
    });

    if (!scene) {
      throw new NotFoundException(`Scene with ID ${id} not found`);
    }

    return scene.toObject();
  }

  update(id: SceneId, updateSceneDto: UpdateSceneDto) {
    return `This action updates a ${id} scene`;
  }

  async remove(id: SceneId) {
    await this.findOne(id);
    await this.sceneModel.deleteOne({
      id: id
    });
  }

  private async validateClipAvailability(scene: Scene, partialUploadAllowed: boolean = false) {
    if (!scene.workspace._workspace) {
      this.logger.debug('Workspace not found, loading it now');
      scene.workspace._workspace = await this.workspaceService.findOne(scene.workspace.id);
    }
    
    const clips = scene.clips.map((clip) => clip.id);
    for (const clip of clips) {
      const file = scene.workspace._workspace.files.find((file) => file.name === clip);
      if (!file) {
        throw new ConflictException(`Clip with ID ${clip} not found in workspace`);
      }

      if (!partialUploadAllowed) {
        if (!file.uploadFinished) {
          throw new ConflictException(`Clip with ID ${clip} is not fully uploaded yet. Please wait until the upload has finished.`);
        }
      }
    }
  }
}
