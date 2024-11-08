import { Injectable, Logger } from '@nestjs/common';
import { DagArtifactStore } from './entities/dag-artifact-store.entity';
import { ClientSession, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { DagNodeId } from '../dag/entities/dag-node.entity';
import { DAGId } from '../dag/entities/dag.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ArtifactAddedEvent } from './events/artifact-added-event.dto';

@Injectable()
export class ArtifactStoreService {

  private readonly logger = new Logger(ArtifactStoreService.name);

  public constructor(
    @InjectModel(DagArtifactStore.name)
    private readonly dagDtoModel: Model<DagArtifactStore>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async save(artifactStore: DagArtifactStore, session?: ClientSession) {
    const artifactModel = new this.dagDtoModel(artifactStore);
    await artifactModel.save();
    return artifactStore;
  }

  public async addArtifactToStoreOfDag(dagId: DAGId, artifactId: string): Promise<DagArtifactStore> {
    const session = await this.dagDtoModel.startSession();
    session.startTransaction();
    try {
      const store = await this.findForDag(dagId, session);

      if (store.publishedArtifacts.includes(artifactId)) {
        this.logger.warn(`Artifact ${artifactId} already exists in artifact store of dag ${dagId}`);
        return;
      }

      store.publishedArtifacts.push(artifactId);

      await this.save(store, session);

      await this.eventEmitter.emitAsync('artifact.added', new ArtifactAddedEvent({
        artifactId,
        dagId,
        store
      }));
      return store;
    } catch (error) {
      this.logger.error(`Failed to add artifact to artifact store of dag ${dagId}. Artifact: ${artifactId}`);
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  public async findForDag(dagId: DAGId, session?: ClientSession): Promise<DagArtifactStore> {
    return this.dagDtoModel.findOne({ dagId });
  }

}
