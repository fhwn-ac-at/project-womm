import { CompletionCriteriaDto, CompletionCriteriaType } from "../dto/completion-criteria.dto";
import { DependencyDto, DependencyType } from "../dto/dependency.dto";
import { ErrorHandlingAction, ErrorHandlingDto } from "../dto/error-handling.dto";
import { RetryPolicyDto } from "../dto/retry-policy.dto";


export class TaskBuilder {
  private _name: string;
  
  private _dependencies: DependencyDto[] = [];

  private _parameters: any = {};

  private _results: string[] = []

  private _priority: number = 500;

  private _retryPolicy: RetryPolicyDto = new RetryPolicyDto();

  private _timeout: number = 0;

  private _onError: ErrorHandlingDto = new ErrorHandlingDto({ action: ErrorHandlingAction.retry });

  private _completionCriteria: CompletionCriteriaDto[] = []

  public withName(name: string) {
    this._name = name;
    return this;
  }

  public withDependency(type: DependencyType, id: string) {
    this._dependencies.push(new DependencyDto({ type, id }));
    return this;
  }

  public withTaskDependency(id: string) {
    return this.withDependency(DependencyType.task, id);
  }

  public withArtifactDependency(id: string) {
    return this.withDependency(DependencyType.artifact, id);
  }

  public withParameters(parameters: any) {
    this._parameters = parameters;
    return this;
  }

  public withAllResults(results: string[]) {
    this._results = results;
    return this;
  }

  public withResult(result: string) {
    this._results.push(result);
    return this;
  }

  public withPriority(priority: number) {
    this._priority = priority;
    return this;
  }

  public withRetryPolicy(retryPolicy: RetryPolicyDto) {
    this._retryPolicy = retryPolicy;
    return this;
  }

  public withDefaultRetryPolicy() {
    return this.withRetryPolicy(new RetryPolicyDto({
      retryDelay: 1000,
      maxRetryCount: 3,
      exponentialBackoff: true
    }));
  }

  public withTimeout(timeout: number) {
    this._timeout = timeout;
    return this;
  }

  public withOnError(onError: ErrorHandlingDto) {
    this._onError = onError;
    return this;
  }

  public withAllCompletionCriteria(completionCriteria: CompletionCriteriaDto[]) {
    this._completionCriteria = completionCriteria;
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

  public build() {
    return {
      name: this._name,
      dependencies: this._dependencies,
      parameters: this._parameters,
      results: this._results,
      priority: this._priority,
      retryPolicy: this._retryPolicy,
      timeout: this._timeout,
      onError: this._onError,
      completionCriteria: this._completionCriteria
    };
  }
}
