import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactStoreService } from './artifact-store.service';

describe('ArtifactStoreService', () => {
  let service: ArtifactStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArtifactStoreService],
    }).compile();

    service = module.get<ArtifactStoreService>(ArtifactStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
