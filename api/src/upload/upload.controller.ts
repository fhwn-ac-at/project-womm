import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, UseInterceptors } from '@nestjs/common';
import { UploadService } from './upload.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { RegisteredUploadId } from './entities/upload.entity';
import { FileValidationPipe } from './file-validation/file-validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiConsumes } from '@nestjs/swagger';

@Controller({
  version: '1',
  path: 'uploads'
})
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }


  

  @UseInterceptors(FileInterceptor('part'))
  @ApiConsumes('multipart/form-data')
  @Post(':uploadId/part')
  public async uploadPart(@Param('uploadId') uploadId: RegisteredUploadId, @UploadedFile(FileValidationPipe) uploadedFile) {

  }
}
