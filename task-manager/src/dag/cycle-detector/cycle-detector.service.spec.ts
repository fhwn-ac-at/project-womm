import { Test, TestingModule } from '@nestjs/testing';
import { CycleDetectorService } from './cycle-detector.service';

describe('CycleDetectorService', () => {
  let service: CycleDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CycleDetectorService],
    }).compile();

    service = module.get<CycleDetectorService>(CycleDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
