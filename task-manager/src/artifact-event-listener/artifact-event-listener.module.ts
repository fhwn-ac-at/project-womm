import { Module } from '@nestjs/common';
import { ArtifactEventListenerController } from './artifact-event-listener.controller';
import { ArtifactStoreModule } from '../artifact-store/artifact-store.module';
import { DagModule } from '../dag/dag.module';

@Module({
  providers: [],
  controllers: [ArtifactEventListenerController],
  imports: [
    ArtifactStoreModule,
    DagModule
  ],
})
export class ArtifactEventListenerModule {}
