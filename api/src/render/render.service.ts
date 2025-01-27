import { Injectable } from '@nestjs/common';
import { Scene } from '../scenes/entities/scene.entity';

@Injectable()
export class RenderService {

  public constructor() {}

  public async renderScene(scene: Scene) {
    
  }

}
