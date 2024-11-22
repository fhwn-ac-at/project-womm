import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectS3, S3 } from 'nestjs-s3';
import { S3Path } from '../types/s3Path.type';
import { RegisterdUplaodPart } from '../upload/entities/upload-part.entity';

@Injectable()
export class StorageService {

  private readonly logger = new Logger(StorageService.name);

  private readonly bucketName = this.config.get('S3_BUCKET_NAME', 'workspaces');

  public constructor(
    @InjectS3()
    private readonly s3: S3,
    private readonly config: ConfigService
  ) { }

  public async uploadFileFromBuffer(buffer: Buffer, path: S3Path) {
    this.logger.log(`Uploading file to S3 bucket ${this.bucketName} at path ${path}`);

    this.s3.createMultipartUpload

    return this.s3.putObject({
      Bucket: this.bucketName,
      Key: path,
      Body: buffer
    });
  }

  public async startMultiPartUpload(path: S3Path) {
    const res = await this.s3.createMultipartUpload({
      Bucket: this.bucketName,
      Key: path
    });

    return res.UploadId;
  }

  public async uplaodPart(uploadId: string, partNumber: number, buffer: Buffer, path: S3Path) {
    return this.s3.uploadPart({
      Bucket: this.bucketName,
      Key: path,
      PartNumber: partNumber,
      UploadId: uploadId,
      Body: buffer
    });
  }

  public async finidhMultiPartUpload(uploadId: string, parts: RegisterdUplaodPart[], path: S3Path) {
    return this.s3.completeMultipartUpload({
      Bucket: this.bucketName,
      Key: path,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map(part => ({
          ETag: part._ETag,
          PartNumber: part.partNumber
        }))
      }
    })
  }

}
