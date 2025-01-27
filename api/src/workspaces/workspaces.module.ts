import { forwardRef, Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { StorageModule } from '../storage/storage.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Workspace, WorkspaceSchema } from './entities/workspace.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema }
    ]),
    StorageModule,
    forwardRef(() => UploadModule)
  ],
  exports: [WorkspacesService]
})
export class WorkspacesModule { }
