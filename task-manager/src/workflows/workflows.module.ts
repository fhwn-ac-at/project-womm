import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { DagModule } from 'src/dag/dag.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CreateWorkflowDefinition, WorkflowDefinitionSchema } from './entities/create-workflow-definition.entity';
import { Task, TaskSchema } from './entities/task.entity';
import { RetryPolicy, RetryPolicySchema } from './entities/retry-policy.entity';
import { ErrorHandling, ErrorHandlingSchema } from './entities/error-handling.entity';
import { Dependency, DependencySchema } from './entities/dependency.entity';
import { CompletionCriteria, CompletionCriteriaSchema } from './entities/completion-criteria.entity';

@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  imports: [
    MongooseModule.forFeature([
      { name: CreateWorkflowDefinition.name, schema: WorkflowDefinitionSchema },
    ]),
    DagModule
  ]
})
export class WorkflowsModule { }
