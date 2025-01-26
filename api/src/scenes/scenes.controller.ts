import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { SceneId } from './entities/scene.entity';
import { CreateClipDto } from './dto/create-clip.dto';

@Controller({
  version: '1',
  path: 'scenes'
})
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

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
  addClipFromScene(@Param('id') id: SceneId) {
  }

  @Delete(':id/clips/:clipName')
  removeClipFromScene() {

  }

  @Patch(':id/clips/:clipName')
  updateClipInScene() {
  }

  @Patch(':id/layers/:layerIndex')
  addClipToLayer(@Param('id') id: SceneId, @Param('layerIndex') layerIndex: number, @Body() clip: CreateClipDto) {
    return this.scenesService.addClipToLayer(id, layerIndex, clip);

  }

  @Delete(':id/layers/:layerIndex/clips/:clipName')
  removeClipFromLayer() {

  }

  @Patch(':id/layers/:layerIndex/clips/:clipName')
  updateClipInLayer() {
  }
}
