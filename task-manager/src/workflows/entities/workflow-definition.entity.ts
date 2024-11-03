import { CreateWorkflowDefinition } from "./create-workflow-definition.entity";


export class WorkflowDefinition extends CreateWorkflowDefinition {
  id: string;

  constructor(partial: Partial<WorkflowDefinition>) {
    const { id, ...rest } = partial;
    super(rest);
    this.id = id;
  }
}
