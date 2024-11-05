import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DagModule } from 'src/dag/dag.module';

@Module({
  providers: [SchedulerService],
  imports: [
    ClientsModule.register([
      { name: 'TasksService', transport: Transport.RMQ, options: { urls: ['amqp://localhost:5672'], queue: 'tasks', queueOptions: { durable: true } } },
    ]),
    DagModule,
  ],
  exports: [
    SchedulerService
  ]
})
export class SchedulerModule {}
