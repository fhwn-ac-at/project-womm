import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { DAGDto, DAGDtoSchema } from "../../dag/dto/dag.dto";
import { DAGId } from "../../dag/entities/dag.entity";


@Schema()
export class DagArtifactStore {

  constructor(partial?: Partial<DagArtifactStore>) {
    Object.assign(this, partial);
  }

  @Prop(String)
  dagId: DAGId;

  @Prop([String])
  publishedArtifacts: string[] = [];
}

export const DagArtifactStoreSchema = SchemaFactory.createForClass(DagArtifactStore);
