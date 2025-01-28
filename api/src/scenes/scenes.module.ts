import { Module } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { ScenesController } from './scenes.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Scene, SceneSchema } from './entities/scene.entity';
import { RenderModule } from '../render/render.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  controllers: [ScenesController],
  providers: [ScenesService],
  imports: [
    MongooseModule.forFeature([
      { name: Scene.name, schema: SceneSchema }
    ]),
    WorkspacesModule,
    RenderModule,
    StorageModule
  ],
  exports: [ScenesService]
})
export class ScenesModule {}
