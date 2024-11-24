import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { config } from 'process';
import { UploadService } from '../upload.service';

@Injectable()
export class FileValidationPipe implements PipeTransform {

  constructor(
    private readonly uploadService: UploadService,
  ) { }

  transform(value: Express.Multer.File, metadata: ArgumentMetadata) {
    // get max part size or 64mb by default
    const maxPartSize = this.uploadService.maxPartSize;

    if (!value) {
      throw new BadRequestException('No file part provided');
    }

    if (value.size > maxPartSize) {
      throw new UnprocessableEntityException(`Part is larger the the largest allowed part of ${maxPartSize}B received ${value.size}B`);
    }

    return value;
  }
}
