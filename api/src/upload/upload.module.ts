import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RegisteredUpload, RegisteredUploadSchema } from './entities/upload.entity';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
  imports: [
    MongooseModule.forFeature([
      { name: RegisteredUpload.name, schema: RegisteredUploadSchema }
    ])
  ],
  exports: [UploadService]
})
export class UploadModule { }
