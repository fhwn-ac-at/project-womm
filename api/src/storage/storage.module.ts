import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { VideoAnalyserModule } from '../video-analyser/video-analyser.module';

@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule { }
