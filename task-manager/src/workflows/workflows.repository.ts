import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { WorkflowDefinition } from './entities/workflow-definition.entity';

@Injectable()
export class WorkflowsRepository {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  public async save(workflow: WorkflowDefinition) {
    return await this.knex.transaction(async (trx) => {
      // Insert into WorkflowDefinitions
      const [workflowDefinitionId] = await trx('WorkflowDefinitions')
        .insert({
          name: workflow.name,
          description: workflow.description || null,
          cleanupPolicy: workflow.cleanupPolicy,
        })
        .returning('id');

      // Insert tasks
      for (const task of workflow.tasks) {
        const [taskId] = await trx('Tasks')
          .insert({
            name: task.name,
            workflowDefinitionId,
            parameters: JSON.stringify(task.parameters || {}),
            results: task.results || [],
            priority: task.priority,
            timeout: task.timeout || 0,
          })
          .returning('id');

        // Insert retry policy if it exists
        if (task.retryPolicy) {
          await trx('RetryPolicies').insert({
            taskId,
            maxRetryCount: task.retryPolicy.maxRetryCount,
            retryDelay: task.retryPolicy.retryDelay,
            exponentialBackoff: task.retryPolicy.exponentialBackoff,
          });
        }

        // Insert error handling if it exists
        if (task.onError) {
          await trx('ErrorHandling').insert({
            taskId,
            action: task.onError.action,
          });
        }

        // Insert dependencies
        for (const dependency of task.dependencies) {
          await trx('Dependencies').insert({
            taskId,
            type: dependency.type,
            dependencyId: dependency.id,
          });
        }

        // Insert task-specific completion criteria
        for (const criteria of task.completionCriteria) {
          await trx('CompletionCriteria').insert({
            workflowDefinitionId,
            taskId,
            type: criteria.type,
            criteriaId: criteria.id,
          });
        }
      }

      // Insert workflow-level completion criteria
      for (const criteria of workflow.completionCriteria) {
        await trx('CompletionCriteria').insert({
          workflowDefinitionId,
          type: criteria.type,
          criteriaId: criteria.id,
        });
      }

      return workflowDefinitionId;
    });
  }
}
