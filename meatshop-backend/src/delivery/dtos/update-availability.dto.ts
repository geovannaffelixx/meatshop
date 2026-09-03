import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class UpdateAvailabilityDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  is_online: boolean;
}
