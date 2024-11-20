import { Module } from '@nestjs/common';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowModule } from './workflow/workflow.module';
import { S3Module } from 'nestjs-s3';
import { StorageModule } from './storage/storage.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    WorkspacesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow("MONGO_CONNECTION"),
      }),
      imports: [ConfigModule],
      inject: [ConfigService]
    }),
    S3Module.forRootAsync({
      useFactory: (config: ConfigService) => ({
        config: {
          credentials: {
            accessKeyId: config.getOrThrow('S3_ACCESS_KEY_ID'),
            secretAccessKey: config.getOrThrow('S3_SECRET_ACCESS_KEY'),
          },
          endpoint: config.getOrThrow('S3_ENDPOINT'),
          forcePathStyle: true,
          signatureVersion: 'v4',
        },
      }),
      imports: [ConfigModule],
      inject: [ConfigService]
    }),
    WorkflowModule,
    StorageModule,
    UploadModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
