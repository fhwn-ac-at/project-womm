import { IsEnum, IsString, MaxLength, MinLength, Matches } from "class-validator";

export enum DependencyType {
  task = 'task',
  artifact = 'artifact'
}

export class Dependency {
  @IsEnum(DependencyType)
  type: DependencyType;

  @IsString()
  @MaxLength(64)
  @MinLength(2)
  @Matches(/^[a-zA-Z_\-\d]+$/)
  id: string;
}