import { Module } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { ScenesController } from './scenes.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Scene, SceneSchema } from './entities/scene.entity';

@Module({
  controllers: [ScenesController],
  providers: [ScenesService],
  imports: [
    MongooseModule.forFeature([
      { name: Scene.name, schema: SceneSchema }
    ]),
    WorkspacesModule
  ]
})
export class ScenesModule {}
