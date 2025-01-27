import { Module } from '@nestjs/common';
import { VideoAnalyserService } from './video-analyser.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  providers: [VideoAnalyserService],
  imports: [StorageModule],
  exports: [VideoAnalyserService]
})
export class VideoAnalyserModule {}
