import { Test, TestingModule } from '@nestjs/testing';
import { DagService } from './dag.service';

describe('DagService', () => {
  let service: DagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DagService],
    }).compile();

    service = module.get<DagService>(DagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
