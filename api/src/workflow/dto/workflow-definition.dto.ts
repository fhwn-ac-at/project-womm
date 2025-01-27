import { CreateWorkflowDefinitionDto } from "./create-workflow-definition.dto";

export class WorkflowDefinitionDto extends CreateWorkflowDefinitionDto {
  id: string;

  constructor(partial: Partial<WorkflowDefinitionDto>) {
    const { id, ...rest } = partial;
    super(rest);
    this.id = id;
  }
}
