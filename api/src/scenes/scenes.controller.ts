import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { SceneId } from './entities/scene.entity';

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
}
