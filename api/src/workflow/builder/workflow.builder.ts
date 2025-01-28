import { CompletionCriteriaDto, CompletionCriteriaType } from "../dto/completion-criteria.dto";
import { CreateWorkflowDefinitionDto } from "../dto/create-workflow-definition.dto";
import { CreateWorkflowDto } from "../dto/create-workflow.dto";
import { TaskDto } from "../dto/task.dto";
import { WorkflowDefinitionDto } from "../dto/workflow-definition.dto";
import { TaskBuilder } from "./task.builder";


export class WorkflowBuilder {

  private _name: string;

  private _description: string;

  private _tasks: TaskBuilder[] = [];

  private _completionCriteria: CompletionCriteriaDto[] = [];

  private _cleanupPolicy: string = "";

  public constructor() {}

  public withName(name: string) {
    this._name = name;
    return this;
  }

  public withDescription(description: string) {
    this._description = description;
    return this;
  }

  public withTask(builder: (t: TaskBuilder) => void) {
    const taskBuilder = new TaskBuilder();
    builder(taskBuilder);
    this._tasks.push(taskBuilder);
    return this;
  }

  public withCompletionCriteria(type: CompletionCriteriaType, id: string) {
    this._completionCriteria.push(new CompletionCriteriaDto({ type, id }));
    return this;
  }

  public withTaskCompletionCriteria(id: string) {
    return this.withCompletionCriteria(CompletionCriteriaType.task, id);
  }

  public withArtifactCompletionCriteria(id: string) {
    return this.withCompletionCriteria(CompletionCriteriaType.artifact, id);
  }

  public withCleanupPolicy(policy: string) {
    this._cleanupPolicy = policy;
    return this;
  }

  public build() {
    return new CreateWorkflowDto({
      version: 1,
      workflow: {
        name: this._name,
        description: this._description,
        tasks: this._tasks.map(task => task.build()),
        completionCriteria: this._completionCriteria,
        cleanupPolicy: this._cleanupPolicy,
      }
    });
  }

}
