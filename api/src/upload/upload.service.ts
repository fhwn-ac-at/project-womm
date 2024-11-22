import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { InjectModel } from '@nestjs/mongoose';
import { RegisteredUpload, RegisteredUploadId } from './entities/upload.entity';
import { Model } from 'mongoose';
import { NotFoundError } from 'rxjs';
import { StorageService } from '../storage/storage.service';
import { UplaodPartDto } from './dto/upload-part.dto';
import { RegisteredUploadPartStatus } from './entities/upload-part.entity';

@Injectable()
export class UploadService {

  private readonly logger = new Logger(UploadService.name);

  public constructor(
    @InjectModel(RegisteredUpload.name)
    private readonly uploadModel: Model<RegisteredUpload>,
    private readonly storageService: StorageService
  ) { }

  public async create(createUploadDto: CreateUploadDto): Promise<RegisteredUpload> {
    return this.uploadModel.create(createUploadDto);
  }

  public async addFilePart(uploadId: RegisteredUploadId, uploadPartDto: UplaodPartDto) {
    let upload = await this.findOneOrThrow(uploadId);

    if (!upload._s3UploadId) {
      upload = await this.createS3MultipartUpload(upload);
    }

    const res = this.storageService.uplaodPart(upload._s3UploadId, uploadPartDto.partNumber, uploadPartDto.part, upload._s3Path);

    res.then(async (uploadRes) => {
      this.logger.debug(`Uploaded part ${uploadPartDto.partNumber} for upload ${uploadId}`);
      const finUplaod = await this.setUploadPartCompletedAndUpdateSize(upload, uploadPartDto, uploadRes.ETag);

      if (finUplaod.uploadedSize === finUplaod.expectedSize) {
        this.logger.log(`Upload ${uploadId} is completed`);
        await this.storageService.finidhMultiPartUpload(upload._s3UploadId, finUplaod.parts, upload._s3Path);
      }
    }).catch(async () => {
      this.logger.error(`Failed to upload part ${uploadPartDto.partNumber} for upload ${uploadId}`);
      await this.setUploadPartFailed(upload, uploadPartDto.partNumber);
    });

    return await this.uploadModel.findOneAndUpdate(
      {
        id: upload.uploadId,
        "parts.partNumber": uploadPartDto.partNumber
      }, {
      $push: {
        parts: {
          partNumber: uploadPartDto.partNumber,
          status: RegisteredUploadPartStatus.Uploading
        }
      }
    }, { new: true });

  }

  public async findOneOrThrow(uplaodId: RegisteredUploadId): Promise<RegisteredUpload> {
    const uplaod = this.uploadModel.findOne({ id: uplaodId });

    if (!uplaod) {
      throw new NotFoundException(`Upload with id ${uplaodId} not found`);
    }

    return uplaod;
  }

  private async createS3MultipartUpload(upload: RegisteredUpload): Promise<RegisteredUpload> {
    const seUploadId = await this.storageService.startMultiPartUpload(upload._s3Path);

    return await this.uploadModel.findOneAndUpdate({ id: upload.uploadId }, {
      $set: {
        _s3UploadId: seUploadId
      }
    }, { new: true });
  }

  private async setUploadPartCompletedAndUpdateSize(upload: RegisteredUpload, part: UplaodPartDto, etag: string): Promise<RegisteredUpload> {
    return await this.uploadModel.findOneAndUpdate(
      {
        id: upload.uploadId,
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
        id: upload.uploadId,
        "parts.partNumber": partNumber
      },
      {
        $set: {
          "parts.$.status": RegisteredUploadPartStatus.Failed
        }
      }, { new: true });
  }

}
