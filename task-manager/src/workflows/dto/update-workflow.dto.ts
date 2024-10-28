import { PartialType } from '@nestjs/mapped-types';
import { WorkflowDefinitionDto } from './workflow-definition.dto';

export class UpdateWorkflowDto extends PartialType(WorkflowDefinitionDto) {
  id: number;
}
