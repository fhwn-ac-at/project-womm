import { DAG } from "src/dag/entities/dag.entity";
import { WorkflowDefinition } from "../entities/workflow-definition.entity";
import { WorkflowDefinitionDto } from "./workflow-definition.dto";
import { DAGDto } from "src/dag/dto/dag.dto";


export class SendWorkflowDto extends WorkflowDefinition {

  dag?: DAGDto;

}
