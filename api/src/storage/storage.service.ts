import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectS3, S3 } from 'nestjs-s3';
import { S3Path } from '../types/s3Path.type';
import { RegisterdUplaodPart } from '../upload/entities/upload-part.entity';
import * as fs from 'fs';
import { Readable } from 'stream';
import { VideoAnalyserService } from '../video-analyser/video-analyser.service';

@Injectable()
export class StorageService implements OnModuleInit {

  private readonly logger = new Logger(StorageService.name);

  private readonly bucketName = this.config.get('S3_BUCKET_NAME', 'workspaces');

  public constructor(
    @InjectS3()
    private readonly s3: S3,
    private readonly config: ConfigService,
  ) { }

  async onModuleInit() {
    // create the s3 bucket if it doesn't exist
    this.logger.verbose(
      `Creating new bucket if it does not exists: ${this.bucketName}`,
    );
    if (!(await this.checkIfBucketExists(this.bucketName))) {
      await this.createBucket(this.bucketName);
      this.logger.log(`Created new bucket with name ${this.bucketName}`);
    }
  }

  public async checkIfBucketExists(bucketName: string) {
    try {
      await this.s3.headBucket({
        Bucket: bucketName
      })
      return true;
    } catch (error) {
      return false;
    }
  }

  public async createBucket(bucketName: string) {
    return await this.s3.createBucket({
      Bucket: bucketName,
      ObjectLockEnabledForBucket: false,
    })
  }

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

  public async finishMultiPartUpload(uploadId: string, parts: RegisterdUplaodPart[], path: S3Path) {
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

  public async downloadFileToDisk(path: S3Path, diskPath: string): Promise<string> {
    const res = await this.s3.getObject({
      Bucket: this.bucketName,
      Key: path,

    });

    return new Promise((resolve, reject) => {
      if (res.Body instanceof Readable) {
        const writeStream = fs.createWriteStream(diskPath);
        res.Body.pipe(writeStream)
          .on('close', () => resolve(diskPath))
          .on('error', reject);
      }
    });
  }

}
