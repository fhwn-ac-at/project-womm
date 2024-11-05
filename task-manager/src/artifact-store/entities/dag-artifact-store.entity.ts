import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { DAGDto, DAGDtoSchema } from "src/dag/dto/dag.dto";


@Schema()
export class DagArtifactStore {

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: DAGDto.name,
  })
  dagId: string;

  @Prop([String])
  publishedArtifacts: string[] = [];
}

export const DagArtifactStoreSchema = SchemaFactory.createForClass(DagArtifactStore);
