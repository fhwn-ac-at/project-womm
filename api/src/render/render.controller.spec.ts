import { Test, TestingModule } from '@nestjs/testing';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';

describe('RenderController', () => {
  let controller: RenderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RenderController],
      providers: [RenderService],
    }).compile();

    controller = module.get<RenderController>(RenderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
