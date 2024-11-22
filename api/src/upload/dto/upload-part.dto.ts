import { IsNumber, IsPositive, Max, Min } from "class-validator";


export class UplaodPartDto {
  @IsNumber()
  @Min(0)
  @Max(5000)
  partNumber: number;

  @IsNumber()
  @IsPositive()
  partSize: number;

  part: Buffer;
}
