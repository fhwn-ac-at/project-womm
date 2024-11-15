import { Body, ClassSerializerInterceptor, Controller, Get, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowDefinitionDto } from './dto/workflow-definition.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { GetWorkflowOptions } from './dto/get-workflow-options.dto';

@Controller('/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) { }


  @Post()
  async createApi(@Body() workflow: WorkflowDefinitionDto) {
    return await this.workflowsService.create(workflow);
  }

  @Get(':id')
  // @UseInterceptors(ClassSerializerInterceptor)
  async findOne(@Param('id') id: string, @Query() query: GetWorkflowOptions) {
    return await this.workflowsService.findOne(id, query);
  }

  // @MessagePattern('createWorkflow')
  // create(@Payload() createWorkflowDto: CreateWorkflowDto) {
  //   return this.workflowsService.create(createWorkflowDto);
  // }

  // @MessagePattern('findAllWorkflows')
  // findAll() {
  //   return this.workflowsService.findAll();
  // }

  // @MessagePattern('findOneWorkflow')
  // findOne(@Payload() id: number) {
  //   return this.workflowsService.findOne(id);
  // }

  // @MessagePattern('updateWorkflow')
  // update(@Payload() updateWorkflowDto: UpdateWorkflowDto) {
  //   return this.workflowsService.update(updateWorkflowDto.id, updateWorkflowDto);
  // }

  // @MessagePattern('removeWorkflow')
  // remove(@Payload() id: number) {
  //   return this.workflowsService.remove(id);
  // }
}
