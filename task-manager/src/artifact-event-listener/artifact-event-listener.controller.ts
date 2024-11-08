import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { ArtifactEventDto } from './dto/artifact-event.dto';
import { ArtifactStoreService } from '../artifact-store/artifact-store.service';
import { DagService } from '../dag/dag.service';

@Controller('artifact-event-listener')
export class ArtifactEventListenerController {


  public constructor(
    private readonly artifactStoreService: ArtifactStoreService,
    private readonly dagService: DagService
  ) {}

  @EventPattern('artifact_uploaded')
  public async artifactUploaded(event: ArtifactEventDto) {
    const dag = await this.dagService.getDagWithNodeId(event.taskId);
    this.artifactStoreService.addArtifactToStoreOfDag(dag.id, event.artifactId);
  }

}
