import { Injectable, Logger } from '@nestjs/common';
import { Scene } from '../scenes/entities/scene.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkflowBuilder } from '../workflow/builder/workflow.builder';
import { RenderStrategy, RenderStrategyContext } from './render-strategies/render-strategy';
import { SimpleSingleLayerRenderStrategy } from './render-strategies/simple-single-layer-render.strategy';
import { RenderStrategyResult } from './render-strategies/render-strategy-result';
import { CreateWorkflowDto } from '../workflow/dto/create-workflow.dto';
import { WorkflowService } from '../workflow/workflow.service';
import { firstValueFrom, map } from 'rxjs';

@Injectable()
export class RenderService {

  private readonly logger = new Logger(RenderService.name);

  private stategies: RenderStrategy[] = [
    new SimpleSingleLayerRenderStrategy(),
  ];

  public constructor(
    private readonly workspaceService: WorkspacesService, 
    private readonly workflowService: WorkflowService
  ) {}

  public async createRenderPlan(scene: Scene) {
    if (!scene.workspace._workspace) {
      this.logger.debug('No workspace provided for scene. Fetching workspace from database');
      scene.workspace._workspace = await this.workspaceService.findOne(scene.workspace.id);
    }
    
    const context: RenderStrategyContext = {
      workspace: scene.workspace._workspace,
    }

    const workflowDrafts: RenderStrategyResult[] = [];
    for (const strategy of this.stategies) {
      try {
        const result = await strategy.generateRenderWorkflow(scene, context);
        workflowDrafts.push(result);
      } catch (error) {
        this.logger.error(`Error while generating render workflow with strategy ${strategy.constructor.name} for scene ${scene.id}`, error.stack, error);
      }
    }

    // choose the workflow with the lowest amount of tasks
    const workflowDraft = workflowDrafts.reduce((prev, current) => prev.workflow.workflow.tasks.length < current.workflow.workflow.tasks.length ? prev : current);

    return workflowDraft;
  }

  public async renderScene(scene: Scene) {
    const renderPlan = await this.createRenderPlan(scene); 
    this.logger.debug(`Render plan for scene ${scene.id} created`);
    console.dir(renderPlan);

    return firstValueFrom(this.workflowService.startWorkflow(renderPlan.workflow).pipe(
      map((result) => {
        this.logger.log(`Render workflow started for scene ${scene.id}`);

        return {
          renderPlan: renderPlan.workflow,
          warnings: renderPlan.warnings,
          dag: result.dag,
          scene: scene,
        };
      })
    ));
  }

}
