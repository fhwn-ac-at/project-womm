import { CreateWorkflowDto } from "../../workflow/dto/create-workflow.dto";


export interface RenderStrategyResult {
  workflow: CreateWorkflowDto;

  warnings: string[];
}
