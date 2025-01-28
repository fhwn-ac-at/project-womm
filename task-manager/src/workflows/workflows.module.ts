import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { DagModule } from '../dag/dag.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CreateWorkflowDefinition, WorkflowDefinitionSchema } from './entities/create-workflow-definition.entity';
import { Task, TaskSchema } from './entities/task.entity';
import { RetryPolicy, RetryPolicySchema } from './entities/retry-policy.entity';
import { ErrorHandling, ErrorHandlingSchema } from './entities/error-handling.entity';
import { Dependency, DependencySchema } from './entities/dependency.entity';
import { CompletionCriteria, CompletionCriteriaSchema } from './entities/completion-criteria.entity';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ArtifactStoreModule } from '../artifact-store/artifact-store.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  imports: [
    MongooseModule.forFeature([
      { name: CreateWorkflowDefinition.name, schema: WorkflowDefinitionSchema },
    ]),
    DagModule,
    SchedulerModule,
    ArtifactStoreModule,
    ClientsModule.registerAsync({
      clients: [
        {
          name: 'WORKFLOW_UPDATES',
          useFactory: (config: ConfigService) => ({
            options: {
              urls: [config.getOrThrow<string>("RABBITMQ_URL")],
              queue: 'workflow_updates',
              queueOptions: {
                durable: true
              },
            },
            transport: Transport.RMQ
          }),
          inject: [ConfigService]
        }
      ]
    }),
  ]
})
export class WorkflowsModule { }
