import { Test, TestingModule } from '@nestjs/testing';
import { FunctionExecutorService } from './function-executor.service';

describe('FunctionExecutorService', () => {
  let service: FunctionExecutorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FunctionExecutorService],
    }).compile();

    service = module.get<FunctionExecutorService>(FunctionExecutorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
