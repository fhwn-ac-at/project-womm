import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { SchedulerService } from 'src/scheduler/scheduler.service';

@Controller('task-event-listener')
export class TaskEventListenerController {

  private readonly logger = new Logger(TaskEventListenerController.name);  

  public constructor(
    private readonly schedulerService: SchedulerService
  ) {}

  @EventPattern('task_processing_started')
  public processingStarted() {
    this.logger.log('Processing started');
  }

  @EventPattern('task_processing_completed')
  public taskProcessingCompleted() {
    this.logger.log('Processing completed');
  }

  @EventPattern('task_processing_failed')
  public taskProcessingFailed() {
    this.logger.log('Processing failed');
  }

  @MessagePattern('task_hold_request')
  public taskHoldRequest() {
    this.logger.log('Task hold requested');
  }


}
