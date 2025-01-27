import { Test, TestingModule } from '@nestjs/testing';
import { VideoAnalyserService } from './video-analyser.service';

describe('VideoAnalyserService', () => {
  let service: VideoAnalyserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoAnalyserService],
    }).compile();

    service = module.get<VideoAnalyserService>(VideoAnalyserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
