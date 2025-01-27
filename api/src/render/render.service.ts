import { Injectable, Logger } from '@nestjs/common';
import { Scene } from '../scenes/entities/scene.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkflowBuilder } from '../workflow/builder/workflow.builder';

@Injectable()
export class RenderService {

  private readonly logger = new Logger(RenderService.name);

  public constructor(
    private readonly workspaceService: WorkspacesService, 
  ) {}

  public async renderScene(scene: Scene) {
    if (!scene.workspace._workspace) {
      this.logger.debug('No workspace provided for scene. Fetching workspace from database');
      scene.workspace._workspace = await this.workspaceService.findOne(scene.workspace.id);
    }

    const workflowBuilder = new WorkflowBuilder();

       
  }

}
