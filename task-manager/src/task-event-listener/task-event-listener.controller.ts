import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { SchedulerService } from '../scheduler/scheduler.service';
import { TaskUpdateEventDto } from './dto/task-update-event.dto';
import { TaskHoldRequestDto } from './dto/task-hold-request.dto';

@Controller('task-event-listener')
export class TaskEventListenerController {

  private readonly logger = new Logger(TaskEventListenerController.name);

  public constructor(
    private readonly schedulerService: SchedulerService
  ) { }

  @EventPattern('task_processing_started')
  public processingStarted(event: TaskUpdateEventDto) {
    this.logger.log(`Processing started for task ${event.taskId} on worker ${event.worker}`);
    try {
      this.schedulerService.taskStarted(event.taskId);
    } catch (error) {
      this.logger.error(`Error while processing started task ${event.taskId}: ${error}`); 
    }
  }

  @EventPattern('task_processing_completed')
  public taskProcessingCompleted(event: TaskUpdateEventDto) {
    this.logger.log(`Processing completed for task ${event.taskId} on worker ${event.worker}`);
    try {
      this.schedulerService.taskCompleted(event.taskId);
    } catch (error) {
      this.logger.error(`Error while processing completed task ${event.taskId}: ${error}`);
    }
  }

  @EventPattern('task_processing_failed')
  public taskProcessingFailed(event: TaskUpdateEventDto) {
    this.logger.log(`Processing failed for task ${event.taskId} on worker ${event.worker}`);
    try {
      this.schedulerService.taskFailed(event.taskId);
    } catch (error) {
      this.logger.error(`Error while processing failed task ${event.taskId}: ${error}`);
    }
  }

  @EventPattern('task_hold_request')
  public async taskHoldRequest(request: TaskHoldRequestDto) {
    this.logger.log(`Hold requested for worker ${request.worker}`);
    try {
      await this.schedulerService.taskHoldRequested(request.worker);
    } catch (error) {
      this.logger.error(`Error while processing hold request for worker ${request.worker}: ${error}`);
    }
  }


}
