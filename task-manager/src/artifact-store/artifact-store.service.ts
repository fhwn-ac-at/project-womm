import { Injectable } from '@nestjs/common';
import { DagArtifactStore } from './entities/dag-artifact-store.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ArtifactStoreService {

  public constructor(
    @InjectModel(DagArtifactStore.name)
    private readonly dagDtoModel: Model<DagArtifactStore>,
  ) {}

  public async save(artifactStore: DagArtifactStore) {
    const artifactModel = new this.dagDtoModel(artifactStore);
    await artifactModel.save();
    return artifactStore;
  }

  public async findForDag(dagId: string) {
    return this.dagDtoModel.find({ dagId });
  }

}
