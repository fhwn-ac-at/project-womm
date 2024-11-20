import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddFileDto } from './dto/add-file.dto';
import { WorkspaceId } from './entities/workspace.entity';

@Controller({
  version: '1',
  path: 'workspaces'
})
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) { }

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceDto) {
    return this.workspacesService.create(createWorkspaceDto);
  }

  @Get()
  findAll() {
    return this.workspacesService.findAll();
  }

  @Put(':workspaceId/files')
  addFile(@Body() addFileDto: AddFileDto, @Param('workspaceId') workspaceId: WorkspaceId) {
    return this.workspacesService.addFile(workspaceId, addFileDto);
  }
}
