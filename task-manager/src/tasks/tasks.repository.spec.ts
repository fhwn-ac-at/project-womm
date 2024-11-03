import { Test, TestingModule } from '@nestjs/testing';
import { TasksRepository } from './tasks.repository';

describe('TasksService', () => {
  let service: TasksRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksRepository],
    }).compile();

    service = module.get<TasksRepository>(TasksRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
