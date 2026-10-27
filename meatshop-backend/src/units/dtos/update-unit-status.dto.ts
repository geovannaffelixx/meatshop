import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUnitStatusDto {
  @ApiProperty({
    description: 'Whether the unit is visible in the marketplace and accepts new orders',
    example: false,
  })
  @IsBoolean()
  is_active: boolean;
}
