import type { Knex } from "knex";

exports.up = function(knex) {
  return knex.schema
    // WorkflowDefinitions Table
    .createTable('WorkflowDefinitions', function(table) {
      table.increments('id').primary();
      table.string('name', 64).notNullable();
      table.string('description', 10240);
      table.string('cleanupPolicy').notNullable();
      table.timestamps(true, true);
    })

    // Tasks Table
    .createTable('Tasks', function(table) {
      table.increments('id').primary();
      table.string('name', 64).notNullable();
      table.integer('workflowDefinitionId')
        .unsigned()
        .references('id')
        .inTable('WorkflowDefinitions')
        .onDelete('CASCADE');
      table.json('parameters').defaultTo('{}');
      table.specificType('results', 'text ARRAY');
      table.integer('priority').defaultTo(500);
      table.integer('timeout').defaultTo(0);
      table.timestamps(true, true);
    })

    // RetryPolicies Table
    .createTable('RetryPolicies', function(table) {
      table.increments('id').primary();
      table.integer('taskId')
        .unsigned()
        .references('id')
        .inTable('Tasks')
        .onDelete('CASCADE');
      table.integer('maxRetryCount').defaultTo(0);
      table.integer('retryDelay').defaultTo(0);
      table.boolean('exponentialBackoff').defaultTo(false);
    })

    // ErrorHandling Table
    .createTable('ErrorHandling', function(table) {
      table.increments('id').primary();
      table.integer('taskId')
        .unsigned()
        .references('id')
        .inTable('Tasks')
        .onDelete('CASCADE');
      table.enum('action', ['retry', 'escalate', 'error']).defaultTo('error');
    })

    // Dependencies Table
    .createTable('Dependencies', function(table) {
      table.increments('id').primary();
      table.integer('taskId')
        .unsigned()
        .references('id')
        .inTable('Tasks')
        .onDelete('CASCADE');
      table.enum('type', ['task', 'artifact']).notNullable();
      table.string('dependencyId', 64).notNullable();
    })

    // CompletionCriteria Table
    .createTable('CompletionCriteria', function(table) {
      table.increments('id').primary();
      table.integer('workflowDefinitionId')
        .unsigned()
        .references('id')
        .inTable('WorkflowDefinitions')
        .onDelete('CASCADE');
      table.integer('taskId')
        .unsigned()
        .references('id')
        .inTable('Tasks')
        .onDelete('CASCADE');
      table.enum('type', ['task', 'artifact']).notNullable();
      table.string('criteriaId', 64).notNullable();
    })

    // DagNodes Table
    .createTable('DagNodes', function(table) {
      table.increments('id').primary();
      table.integer('workflowDefinitionId')
        .unsigned()
        .references('id')
        .inTable('WorkflowDefinitions')
        .onDelete('CASCADE');
      table.string('nodeId', 64).notNullable();
      table.integer('taskId')
        .unsigned()
        .references('id')
        .inTable('Tasks')
        .onDelete('CASCADE');
    })

    // DagEdges Table
    .createTable('DagEdges', function(table) {
      table.increments('id').primary();
      table.integer('fromNodeId')
        .unsigned()
        .references('id')
        .inTable('DagNodes')
        .onDelete('CASCADE');
      table.integer('toNodeId')
        .unsigned()
        .references('id')
        .inTable('DagNodes')
        .onDelete('CASCADE');
      table.enum('conditionType', ['task', 'artifact']).notNullable();
      table.string('artifactId', 64);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('DagEdges')
    .dropTableIfExists('DagNodes')
    .dropTableIfExists('CompletionCriteria')
    .dropTableIfExists('Dependencies')
    .dropTableIfExists('ErrorHandling')
    .dropTableIfExists('RetryPolicies')
    .dropTableIfExists('Tasks')
    .dropTableIfExists('WorkflowDefinitions');
};
