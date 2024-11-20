import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddFileDto } from './dto/add-file.dto';
import { Workspace, WorkspaceId } from './entities/workspace.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { S3Path } from '../types/s3Path.type';
import { NotFoundError } from 'rxjs';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class WorkspacesService {

  private readonly logger = new Logger(WorkspacesService.name);

  public constructor(
    @InjectModel(Workspace.name)
    private readonly workspaceModel: Model<Workspace>,
    private readonly uploadService: UploadService
  ) { }

  async create(createWorkspaceDto: CreateWorkspaceDto): Promise<Workspace> {
    return this.workspaceModel.create(createWorkspaceDto);
  }

  async addFile(workspaceId: WorkspaceId, addFileDto: AddFileDto): Promise<WorkspaceFile> {
    const workspace = await this.findOne(workspaceId);

    if (workspace.files.some(file => file.name === addFileDto.name)) {
      throw new ConflictException(`File with name ${addFileDto.name} already exists in workspace ${workspaceId}`);
    }

    const s3Path = `${workspace.s3BasePath}${addFileDto.name}` as S3Path;
    const upload = await this.uploadService.create({
      expectedSize: addFileDto.fileSize,
      s3Path: s3Path
    })

    const file = new WorkspaceFile({
      ...addFileDto,
      s3Path,
      uploadId: upload.id
    });

    await this.workspaceModel.updateOne({
      id: workspaceId
    }, {
      $push: {
        files: file
      }
    })

    return file;
  }

  findAll() {
    return `This action returns all workspaces`;
  }

  public async findOne(id: WorkspaceId): Promise<Workspace> {
    const workspace = this.workspaceModel.findOne({
      id
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with id ${id} not found`);
    }

    return workspace;
  }

  update(id: number, updateWorkspaceDto: UpdateWorkspaceDto) {
    return `This action updates a #${id} workspace`;
  }

  remove(id: number) {
    return `This action removes a #${id} workspace`;
  }
}