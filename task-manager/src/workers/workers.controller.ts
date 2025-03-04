import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { WorkerHeartbeatDto } from './dto/worker-heartbeat-event.dto';
import { WorkersService } from './workers.service';

@Controller('workers')
export class WorkersController {

  private readonly logger = new Logger(WorkersController.name);

  public constructor(
    private readonly workerService: WorkersService
  ) { }


  @EventPattern('worker_heartbeat')
  public heartbeat(event: WorkerHeartbeatDto) {
    this.logger.log(`Heartbeat received from worker ${event.name} listening on ${event.listensOn}`);
    try {
      this.workerService.processWorkerHeartbeat(event);
    } catch (error) {
      this.logger.error(`Error while processing heartbeat from worker ${event.name}: ${error}`);
    }
  }

}
