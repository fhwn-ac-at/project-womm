import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';


@Module({
  providers: [WorkflowService],
  imports: [
    ClientsModule.registerAsync({
      clients: [
        {
          name: 'WORKFLOW_SERVICE',
          useFactory: (config: ConfigService) => ({
            options: {
              urls: [config.getOrThrow<string>("RABBITMQ_URL")],
              queue: 'workflow_control',
              queueOptions: {
                durable: true
              },
            },
            transport: Transport.RMQ
          }),
          inject: [ConfigService]
        }
      ]
    })
  ],
  exports: [WorkflowService]
})
export class WorkflowModule {}
