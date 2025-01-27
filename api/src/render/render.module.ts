import { Module } from '@nestjs/common';
import { RenderService } from './render.service';
import { RenderController } from './render.controller';

@Module({
  controllers: [RenderController],
  providers: [RenderService],
})
export class RenderModule {}
