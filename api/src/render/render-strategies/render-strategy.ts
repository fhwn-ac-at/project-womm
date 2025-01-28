import { Scene } from "../../scenes/entities/scene.entity";
import { CreateWorkflowDto } from "../../workflow/dto/create-workflow.dto";
import { Workspace } from "../../workspaces/entities/workspace.entity";
import { RenderStrategyResult } from "./render-strategy-result";


export interface RenderStrategyContext {
  workspace: Workspace;
}

export interface RenderStrategy {

  generateRenderWorkflow(scene: Scene, context: RenderStrategyContext): Promise<RenderStrategyResult>;
  
}
