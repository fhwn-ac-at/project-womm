import { Test, TestingModule } from '@nestjs/testing';
import { TaskEventListenerController } from './task-event-listener.controller';

describe('TaskEventListenerController', () => {
  let controller: TaskEventListenerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskEventListenerController],
    }).compile();

    controller = module.get<TaskEventListenerController>(TaskEventListenerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
