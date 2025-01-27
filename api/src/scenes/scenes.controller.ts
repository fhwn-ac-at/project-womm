import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { SceneId } from './entities/scene.entity';
import { CreateClipDto } from './dto/create-clip.dto';
import { CreateClipDefinitionDto } from './dto/create-clip-definition.dto';
import { ClipId } from './entities/clip-definition.entity';
import { UpdateClipDefinitionDto } from './dto/update-clip-definition.dto';
import { UpdateClipDto } from './dto/update-clip.dto';
import { RenderService } from '../render/render.service';

@Controller({
  version: '1',
  path: 'scenes'
})
export class ScenesController {
  constructor(
    private readonly scenesService: ScenesService,
    private readonly renderService: RenderService
  ) {}

  @Post()
  create(@Body() createSceneDto: CreateSceneDto) {
    return this.scenesService.create(createSceneDto);
  }

  @Get()
  findAll() {
    return this.scenesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: SceneId) {
    return this.scenesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: SceneId, @Body() updateSceneDto: UpdateSceneDto) {
    return this.scenesService.update(id, updateSceneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: SceneId) {
    return this.scenesService.remove(id);
  }

  @Put(':id/layers')
  addLayer(@Param('id') id: SceneId) {
    return this.scenesService.addLayerToScene(id);
  }

  @Delete(':id/layers/:layerIndex')
  removeLayer(@Param('id') id: SceneId, @Param('layerIndex') layerIndex: number) {
    return this.scenesService.removeLayerFromScene(id, layerIndex);
  }

  @Put(':id/clips')
  addClipToScene(@Param('id') sceneId: SceneId, @Body() clip: CreateClipDefinitionDto) {
    return this.scenesService.addClipToScene(sceneId, clip);
  }

  @Delete(':id/clips/:clipId')
  removeClipFromScene(@Param('id') sceneId: SceneId, @Param('clipId') clipId: ClipId) {
    return this.scenesService.removeClipFromScene(sceneId, clipId)
  }

  @Patch(':id/clips/:clipId')
  updateClipInScene(@Param('id') sceneId: SceneId, @Param('clipId') clipId: ClipId, @Body() clip: UpdateClipDefinitionDto) {
    return this.scenesService.updateClipInScene(sceneId, clipId, clip);
  }

  @Put(':id/layers/:layerIndex/clips')
  addClipToLayer(@Param('id') id: SceneId, @Param('layerIndex') layerIndex: number, @Body() clip: CreateClipDto) {
    return this.scenesService.addClipToLayer(id, layerIndex, clip);
  }

  @Delete(':id/layers/:layerIndex/clips/:clipName')
  removeClipFromLayer(@Param('id') id: SceneId, @Param('layerIndex') layerIndex: number, @Param('clipName') clipId: ClipId) {
    return this.scenesService.removeClipFromLayer(id, layerIndex, clipId);
  }

  @Patch(':id/layers/:layerIndex/clips/:clipName')
  updateClipInLayer(@Param('id') id: SceneId, @Param('layerIndex') layerIndex: number, @Param('clipName') clipId: ClipId, @Body() clip: UpdateClipDto) {
    return this.scenesService.updateClipInLayer(id, layerIndex, clipId, clip);
  }

  @Post(':id/render')
  async renderScene(@Param('id') id: SceneId) {
    const scene = await this.scenesService.findOne(id); 
    return this.renderService.renderScene(scene);
  }
}
