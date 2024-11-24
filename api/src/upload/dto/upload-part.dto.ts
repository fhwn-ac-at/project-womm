import { Transform } from "class-transformer";
import { IsDefined, IsNumber, IsPositive, Max, Min } from "class-validator";


export class UplaodPartDto {
  @IsNumber()
  @IsPositive()
  @Max(5000)
  @Transform(({ value }) => parseInt(value))
  partNumber: number;

  part: Buffer;
}
