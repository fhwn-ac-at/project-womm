import { Module } from '@nestjs/common';
import { CycleDetectorService } from './cycle-detector.service';

@Module({
  providers: [CycleDetectorService],
  exports: [CycleDetectorService]
})
export class CycleDetectorModule { }
