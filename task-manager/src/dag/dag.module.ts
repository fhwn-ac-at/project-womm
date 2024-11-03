import { Module } from '@nestjs/common';
import { DagService } from './dag.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DAG } from './entities/dag.entity';
import { DAGDto, DAGDtoSchema } from './dto/dag.dto';
import { CycleDetectorModule } from './cycle-detector/cycle-detector.module';

@Module({
  providers: [DagService],
  exports: [DagService],
  imports: [
    MongooseModule.forFeature([
      { name: DAGDto.name, schema: DAGDtoSchema }
    ]),
    CycleDetectorModule
  ]
})
export class DagModule { }
