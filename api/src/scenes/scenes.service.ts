import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { createWriteStream } from 'fs';
import { Scene, SceneId } from './entities/scene.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateClipDto } from './dto/create-clip.dto';
import { UpdateClipDefinitionDto } from './dto/update-clip-definition.dto';
import { CreateClipDefinitionDto } from './dto/create-clip-definition.dto';
import { ClipId } from './entities/clip-definition.entity';
import { Clip } from './entities/clip.entity';
import { UpdateClipDto } from './dto/update-clip.dto';
import { S3Path } from '../types/s3Path.type';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ScenesService {

  private logger = new Logger(ScenesService.name);
  
  public constructor(
    @InjectModel(Scene.name)
    private readonly sceneModel: Model<Scene>,
    private readonly workspaceService: WorkspacesService,
    private readonly storageService: StorageService
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
    const objScenes = scenes.map((scene) => scene.toObject());

    for (const scene of objScenes) {
      if (scene.video._processingFinished) {
        scene.video.downloadUrl = await this.storageService.getDownloadUrlFor(scene.video._s3Key);
      }
    }

    return objScenes;
  }

  async findOne(id: SceneId, appendDownloadUrl: boolean = false) {
    const scene = await this.sceneModel.findOne({
      id: id
    });

    if (!scene) {
      throw new NotFoundException(`Scene with ID ${id} not found`);
    }

    const obj = scene.toObject();

    if (appendDownloadUrl && obj.video._processingFinished) {
      obj.video.downloadUrl = await this.storageService.getDownloadUrlFor(obj.video._s3Key);
    }

    return obj;
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

  public async finishProcessingOfWorkflow(workflowId: string) {
    await this.sceneModel.updateOne({
      'video._workflowId': workflowId
    }, {
      'video._processingFinished': true
    })
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

  public async registerWorkflowForScene(id: SceneId, workflowId: string, videoS3Path: S3Path) {
    await this.sceneModel.updateOne({
      id: id
    }, {
      'video._workflowId': workflowId,
      'video._s3Key': videoS3Path
    })
  }

  public async addClipToScene(id: SceneId, clip: CreateClipDefinitionDto) {
    const scene = await this.findOne(id);

    if (scene.clips.some((existingClip) => existingClip.id === clip.id)) {
      throw new ConflictException(`Clip with ID ${clip.id} already exists in scene with ID ${id}`);
    }

    const workspace = await this.workspaceService.findOne(scene.workspace.id);
    if (!workspace.files.some((file) => file.name === clip.id)) {
      throw new NotFoundException(`Clip with ID ${clip.id} not found in workspace`);
    }

    const newScene = await this.sceneModel.findOneAndUpdate({
      id: id
    }, {
      $push: {
        clips: clip
      }
    }, {new: true}); 
    
    return newScene.toObject();
  }

  public async removeClipFromScene(id: SceneId, clipId: ClipId) {
    const scene = await this.findOne(id);

    if (!scene.clips.some((existingClip) => existingClip.id === clipId)) {
      throw new NotFoundException(`Clip with ID ${clipId} not found in scene with ID ${id}`);
    }

    const newScene = await this.sceneModel.findOneAndUpdate({
      id: id
    }, {
      $pull: {
        clips: {
          id: clipId
        }
      }
    }, {new: true});

    return newScene.toObject();
  }

  public async updateClipInScene(id: SceneId, clipName: ClipId, clip: UpdateClipDefinitionDto) {
    const scene = await this.findOne(id);

    if (!scene.clips.some((existingClip) => existingClip.id === clipName)) {
      throw new NotFoundException(`Clip with ID ${clipName} not found in scene with ID ${id}`);
    }

    const newScene = await this.sceneModel.findOneAndUpdate({
      id: id,
      'clips.id': clipName
    }, {
      $set: {
        'clips.$': clip
      }
    }, {new: true});

    return newScene.toObject();
  }

  public async addClipToLayer(id: SceneId, layerIndex: number, clip: CreateClipDto) {
    await this.validateClip(clip);
    const scene = await this.findOne(id);
    
    if (layerIndex < 0 || layerIndex >= scene.layers.length) {
      throw new NotFoundException(`Layer with index ${layerIndex} not found in scene with ID ${id}`);
    }

    scene.layers[layerIndex].clips.push(clip);
    await this.validateClipAvailability(scene, true);

    const newScene = await this.sceneModel.findOneAndUpdate({
      id: id
    }, {
      $push: {
        [`layers.${layerIndex}.clips`]: clip
      }
    }, {new: true});

    return newScene.toObject();
  }

  public async removeClipFromLayer(sceneId: SceneId, layerIndex: number, clip: ClipId) {
    const scene = await this.findOne(sceneId);

    if (layerIndex < 0 || layerIndex >= scene.layers.length) {
      throw new NotFoundException(`Layer with index ${layerIndex} not found in scene with ID ${sceneId}`);
    }

    const layer = scene.layers[layerIndex];
    if (!layer.clips.some((existingClip) => existingClip.id === clip)) {
      throw new NotFoundException(`Clip with ID ${clip} not found in layer with index ${layerIndex} in scene with ID ${sceneId}`);
    }

    const newScene = await this.sceneModel.findOneAndUpdate({
      id: sceneId
    }, {
      $pull: {
        [`layers.${layerIndex}.clips`]: {
          id: clip
        }
      }
    }, {new: true});

    return newScene.toObject();
  }

  public async updateClipInLayer(sceneId: SceneId, layerIndex: number, clipId: ClipId, updateClip: UpdateClipDto) {
    const scene = await this.findOne(sceneId);

    if (layerIndex < 0 || layerIndex >= scene.layers.length) {
      throw new NotFoundException(`Layer with index ${layerIndex} not found in scene with ID ${sceneId}`);
    }

    const layer = scene.layers[layerIndex];
    if (!layer.clips.some((existingClip) => existingClip.id === clipId)) {
      throw new NotFoundException(`Clip with ID ${clipId} not found in layer with index ${layerIndex} in scene with ID ${sceneId}`);
    }

    await this.validateClip(updateClip);

    const newScene = await this.sceneModel.findOneAndUpdate({
      id: sceneId,
      [`layers.${layerIndex}.clips.id`]: clipId
    }, {
      $set: {
        [`layers.${layerIndex}.clips.$`]: updateClip
      }
    }, {new: true});

    return newScene.toObject();
  }

  public async validateClipAvailability(scene: Scene, partialUploadAllowed: boolean = false) {
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
        
        if (file.metadata === undefined) {
          console.dir(file);
          throw new ConflictException(`Clip with ID ${clip} is not jet fully analyzed. Please wait until the analysis has finished.`);
        }
      }

      if (file.metadata) {
        if (!file.metadata.isSupported) {
          throw new ConflictException(`Clip with ID ${clip} is not in a supported format`);
        }
      }
    }

    for (const layer of scene.layers) {
      for (const clip of layer.clips) {
        if (!clips.includes(clip.id)) {
          throw new ConflictException(`Clip with ID ${clip.id} is not defined in the scene`);
        }
      }
    }
  }

  private async validateClip(clip: Partial<Clip>) {
    if (clip.cut) {
      if (clip.cut.to - clip.cut.from !== clip.to - clip.from) {
        throw new BadRequestException(`Clip ${clip.id} has a cut operation that does not match the clip duration`);
      }
    }
  }
}
