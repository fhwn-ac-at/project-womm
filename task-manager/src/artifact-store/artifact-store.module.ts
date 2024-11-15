import { Module } from '@nestjs/common';
import { ArtifactStoreService } from './artifact-store.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DagArtifactStore, DagArtifactStoreSchema } from './entities/dag-artifact-store.entity';

@Module({
  providers: [ArtifactStoreService],
  exports: [ArtifactStoreService],
  imports: [
    MongooseModule.forFeature([
      { name: DagArtifactStore.name, schema: DagArtifactStoreSchema }
    ]),
  ]
})
export class ArtifactStoreModule {}
