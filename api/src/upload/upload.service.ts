import { forwardRef, Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { InjectModel } from '@nestjs/mongoose';
import { RegisteredUpload, RegisteredUploadId } from './entities/upload.entity';
import { Model } from 'mongoose';
import { NotFoundError } from 'rxjs';
import { StorageService } from '../storage/storage.service';
import { UplaodPartDto } from './dto/upload-part.dto';
import { RegisteredUploadPartStatus } from './entities/upload-part.entity';
import { ConfigService } from '@nestjs/config';
import { UploadPartCommandOutput } from '@aws-sdk/client-s3';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { VideoAnalyserService } from '../video-analyser/video-analyser.service';
import { FileMetadata } from '../workspaces/entities/file-metadata.entity';

@Injectable()
export class UploadService {

  private readonly logger = new Logger(UploadService.name);

  public constructor(
    @InjectModel(RegisteredUpload.name)
    private readonly uploadModel: Model<RegisteredUpload>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => WorkspacesService))
    private readonly workspacesService: WorkspacesService,
    private readonly videoAnalyserService: VideoAnalyserService
  ) { }

  public get maxPartSize(): number {
    return this.configService.get('MAX_UPLOAD_PART_SIZE', 64 * 1024 * 1024)
  }

  public async create(createUploadDto: CreateUploadDto): Promise<RegisteredUpload> {
    const doc = await this.uploadModel.create(createUploadDto);

    const upload = doc.toObject();
    upload.maxPartSize = this.maxPartSize;
    return upload;
  }

  public async addFilePart(uploadId: RegisteredUploadId, uploadPartDto: UplaodPartDto): Promise<RegisteredUpload> {
    let upload = await this.findOneOrThrow(uploadId);

    if (!upload._s3UploadId) {
      upload = await this.createS3MultipartUpload(upload);
      this.logger.log(`Created S3 multipart upload ${upload._s3UploadId} for upload ${uploadId}`);
    }

    await this.addPartToUpload(upload, uploadPartDto);
    let finishedUpload: UploadPartCommandOutput = undefined;
    try {
      finishedUpload = await this.storageService.uplaodPart(upload._s3UploadId, uploadPartDto.partNumber, uploadPartDto.part, upload._s3Path);
    } catch (e) {
      this.logger.error(e, `Failed to upload part ${uploadPartDto.partNumber} for upload ${uploadId}`);
      await this.setUploadPartFailed(upload, uploadPartDto.partNumber);
      throw new UnprocessableEntityException(`Failed to upload part ${uploadPartDto.partNumber} for upload ${uploadId}, ${e.message}`);
    }

    this.logger.debug(`Uploaded part ${uploadPartDto.partNumber} for upload ${uploadId}`);
    const updatedUpload = await this.setUploadPartCompletedAndUpdateSize(upload, uploadPartDto, finishedUpload.ETag);
    if (updatedUpload.uploadedSize === updatedUpload.expectedSize) {
      this.logger.log(`Upload ${uploadId} is completed`);
      await this.storageService.finishMultiPartUpload(upload._s3UploadId, updatedUpload.parts, upload._s3Path);
      await this.workspacesService.fileUploadFinishedAt(uploadId, new Date());
      this.analyzeUpload(updatedUpload);
    }

    return this.findOneOrThrow(uploadId);
  }

  public async analyzeUpload(upload: RegisteredUpload): Promise<void> {
    try {
      const fileMetadata = await this.videoAnalyserService.analyzeFileOfS3(upload._s3Path);
      await this.workspacesService.addMetadataToFile(upload.uploadId, fileMetadata);
      this.logger.debug(`Analyzed file ${upload._s3Path}`);
    } catch (e) { 
      this.logger.warn(`Failed to analyze file ${upload._s3Path}: ${e}`);
      try {
        await this.workspacesService.addMetadataToFile(upload.uploadId, new FileMetadata({isSupported: false}));
      } catch (e) {
        this.logger.error(`Failed to add metadata to file ${upload.uploadId}: ${e}`);
      }
    }
  }


  public async findOneOrThrow(uplaodId: RegisteredUploadId): Promise<RegisteredUpload> {
    const uplaodDoc = await this.uploadModel.findOne({ uploadId: uplaodId });

    if (!uplaodDoc) {
      throw new NotFoundException(`Upload with id ${uplaodId} not found`);
    }

    const upload = uplaodDoc.toObject();
    upload.maxPartSize = this.maxPartSize;
    return upload;
  }

  private async createS3MultipartUpload(upload: RegisteredUpload): Promise<RegisteredUpload> {
    const seUploadId = await this.storageService.startMultiPartUpload(upload._s3Path);

    return await this.uploadModel.findOneAndUpdate({ uploadId: upload.uploadId }, {
      $set: {
        _s3UploadId: seUploadId
      }
    }, { new: true });
  }

  private async setUploadPartCompletedAndUpdateSize(upload: RegisteredUpload, part: UplaodPartDto, etag: string): Promise<RegisteredUpload> {
    return await this.uploadModel.findOneAndUpdate(
      {
        uploadId: upload.uploadId,
        "parts.partNumber": part.partNumber
      },
      {
        $set: {
          "parts.$.status": RegisteredUploadPartStatus.Completed,
          "parts.$.partSize": part.part.byteLength,
          "parts.$._ETag": etag
        },
        $inc: {
          uploadedSize: part.part.byteLength
        }
      }, { new: true });
  }

  private async setUploadPartFailed(upload: RegisteredUpload, partNumber: number): Promise<RegisteredUpload> {
    return await this.uploadModel.findOneAndUpdate(
      {
        uploadId: upload.uploadId,
        "parts.partNumber": partNumber
      },
      {
        $set: {
          "parts.$.status": RegisteredUploadPartStatus.Failed
        }
      }, { new: true });
  }

  private async addPartToUpload(upload: RegisteredUpload, part: UplaodPartDto): Promise<RegisteredUpload> {
    return await this.uploadModel.findOneAndUpdate(
      {
        uploadId: upload.uploadId
      },
      {
        $push: {
          parts: {
            partNumber: part.partNumber,
            status: RegisteredUploadPartStatus.Uploading,
            partSize: part.part.byteLength
          }
        }
      }, { new: true });
  }

}
