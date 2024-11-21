import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Exclude } from "class-transformer";
import { S3Path } from "../../types/s3Path.type";
import { WorkspaceFile } from "./workspace-file.entity";
import { v4 as uuidv4 } from 'uuid';

export type WorkspaceId = string & { __brand: "workspaceId" };

@Schema()
export class Workspace {

  @Prop({
    default: uuidv4
  })
  id: WorkspaceId;

  @Prop({
    default: () => `${uuidv4()}/`
  })
  _s3BasePath: S3Path;

  @Prop({
    default: []
  })
  files: WorkspaceFile[];
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);