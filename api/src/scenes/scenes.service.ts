import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { createWriteStream } from 'fs';
import { Scene, SceneId } from './entities/scene.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateClipDto } from './dto/create-clip.dto';

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

  async update(id: SceneId, updateSceneDto: UpdateSceneDto) {
    const scene = await this.findOne(id);
    
    const newScene = await this.sceneModel.findOneAndUpdate({
      id: id
    }, {
      ...updateSceneDto.scene
    }, {new: true});

    return newScene.toObject();
  }

  async remove(id: SceneId) {
    await this.findOne(id);
    await this.sceneModel.deleteOne({
      id: id
    });
  }

  public async addLayerToScene(id: SceneId) {
    const newScene = await this.sceneModel.findOneAndUpdate({
      id: id
    }, {
      $push: {
        layers: {
          clips: []
        }
      }
    }, {new: true});

    if (!newScene) {
      throw new NotFoundException(`Scene with ID ${id} not found`);
    }

    return newScene.toObject();
  }

  public async removeLayerFromScene(id: SceneId, layerIndex: number) {
    const scene = await this.findOne(id);

    if (layerIndex < 0 || layerIndex >= scene.layers.length) {
      throw new NotFoundException(`Layer with index ${layerIndex} not found in scene with ID ${id}`);
    }

    // first set the index to null
    await this.sceneModel.findOneAndUpdate({
      id: id,
    }, {
      $unset: {
        [`layers.${layerIndex}`]: 1
      }
    });

    // second remove all null index values
    const newScene = await this.sceneModel.findOneAndUpdate({
      id: id
    }, {
      $pull: {
        layers: null
      }
    }, {new: true});

    return newScene.toObject();
  }

  public async addClipToLayer(id: SceneId, layerIndex: number, clip: CreateClipDto) {
    const scene = await this.findOne(id);

    
    if (layerIndex < 0 || layerIndex >= scene.layers.length) {
      throw new NotFoundException(`Layer with index ${layerIndex} not found in scene with ID ${id}`);
    }
    
    scene.layers[layerIndex].clips.push(clip);
    await this.validateClipAvailability(scene);

    const newScene = await this.sceneModel.findOneAndUpdate({
      id: id
    }, {
      $push: {
        [`layers.${layerIndex}.clips`]: clip
      }
    }, {new: true});

    return newScene.toObject();
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
