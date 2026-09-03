import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Max, Min } from "class-validator";

export class UpdateDeliveryGoalDto {
  @ApiProperty({ example: 800, minimum: 0, maximum: 1000000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  target: number;
}
