import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UploadService } from './upload.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';

@Controller({
  version: '1',
  path: 'uploads'
})
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

}
