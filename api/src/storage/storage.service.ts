import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectS3, S3 } from 'nestjs-s3';
import { S3Path } from '../types/s3Path.type';

@Injectable()
export class StorageService {

  private readonly logger = new Logger(StorageService.name);

  private readonly bucketName = this.config.get('S3_BUCKET_NAME', 'workspaces');

  public constructor(
    @InjectS3()
    private readonly s3: S3,
    private readonly config: ConfigService
  ) { }

  async uploadFileFromBuffer(buffer: Buffer, path: S3Path) {
    this.logger.log(`Uploading file to S3 bucket ${this.bucketName} at path ${path}`);

    this.s3.createMultipartUpload

    return this.s3.putObject({
      Bucket: this.bucketName,
      Key: path,
      Body: buffer
    });
  }

}
