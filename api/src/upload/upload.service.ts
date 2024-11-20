import { Injectable, Logger } from '@nestjs/common';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { InjectModel } from '@nestjs/mongoose';
import { RegisteredUpload } from './entities/upload.entity';
import { Model } from 'mongoose';

@Injectable()
export class UploadService {

  private readonly logger = new Logger(UploadService.name);

  public constructor(
    @InjectModel(RegisteredUpload.name)
    private readonly uploadModel: Model<RegisteredUpload>
  ) { }

  public async create(createUploadDto: CreateUploadDto): Promise<RegisteredUpload> {
    return this.uploadModel.create(createUploadDto);
  }
}
