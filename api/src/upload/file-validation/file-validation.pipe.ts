import { ArgumentMetadata, Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { config } from 'process';

@Injectable()
export class FileValidationPipe implements PipeTransform {

  constructor(
    private readonly configService: ConfigService
  ) {}

  transform(value: Express.Multer.File, metadata: ArgumentMetadata) {
    // get max part size or 64mb by default
    const maxPartSize = this.configService.get('MAX_UPLOAD_PART_SIZE', 64 * 1024 * 1024)

    if (value.size > maxPartSize) {
      throw new UnprocessableEntityException(`Part is larger the the largest allowed part of ${maxPartSize}B`);
    }

    return value;
  }
}
