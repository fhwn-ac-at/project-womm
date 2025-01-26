import { forwardRef, Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RegisteredUpload, RegisteredUploadSchema } from './entities/upload.entity';
import { StorageModule } from '../storage/storage.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
  imports: [
    MongooseModule.forFeature([
      { name: RegisteredUpload.name, schema: RegisteredUploadSchema }
    ]),
    StorageModule,
    forwardRef(() => WorkspacesModule)
  ],
  exports: [UploadService]
})
export class UploadModule { }
