import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { SchedulerService } from '../scheduler/scheduler.service';
import { TaskUpdateEventDto } from './dto/task-update-event.dto';

@Controller('task-event-listener')
export class TaskEventListenerController {

  private readonly logger = new Logger(TaskEventListenerController.name);

  public constructor(
    private readonly schedulerService: SchedulerService
  ) { }

  @EventPattern('task_processing_started')
  public processingStarted(event: TaskUpdateEventDto) {
    this.logger.log(`Processing started for task ${event.taskId} on worker ${event.worker}`);
    this.schedulerService.taskStarted(event.taskId);
  }

  @EventPattern('task_processing_completed')
  public taskProcessingCompleted(event: TaskUpdateEventDto) {
    this.logger.log(`Processing completed for task ${event.taskId} on worker ${event.worker}`);
    this.schedulerService.taskCompleted(event.taskId);
  }

  @EventPattern('task_processing_failed')
  public taskProcessingFailed(event: TaskUpdateEventDto) {
    this.logger.log(`Processing failed for task ${event.taskId} on worker ${event.worker}`);
    this.logger.log('Processing failed');
  }

  @MessagePattern('task_hold_request')
  public taskHoldRequest() {
    this.logger.log('Task hold requested');
  }


}
