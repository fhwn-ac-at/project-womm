import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactEventListenerController } from './artifact-event-listener.controller';

describe('ArtifactEventListenerController', () => {
  let controller: ArtifactEventListenerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtifactEventListenerController],
    }).compile();

    controller = module.get<ArtifactEventListenerController>(ArtifactEventListenerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
