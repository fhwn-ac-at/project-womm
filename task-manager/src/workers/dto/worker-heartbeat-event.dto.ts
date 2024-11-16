import { IsString, MaxLength } from "class-validator";


export class WorkerHeartbeatDto {

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(100)
  listensOn: string;
}
