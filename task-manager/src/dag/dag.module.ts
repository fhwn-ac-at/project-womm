import { Module } from '@nestjs/common';
import { DagService } from './dag.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DAG } from './entities/dag.entity';
import { DAGDto, DAGDtoSchema } from './dto/dag.dto';

@Module({
  providers: [DagService],
  exports: [DagService],
  imports: [
    MongooseModule.forFeature([
      { name: DAGDto.name, schema: DAGDtoSchema }
    ])
  ]
})
export class DagModule { }
