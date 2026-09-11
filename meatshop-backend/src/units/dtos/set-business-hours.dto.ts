import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { BusinessHoursDayDto } from './business-hours-day.dto';

export class SetBusinessHoursDto {
  @ApiProperty({
    description:
      'Unit business hours. Each provided day replaces its existing hours; omitted days remain unchanged.',
    type: [BusinessHoursDayDto],
  })
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDayDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  days: BusinessHoursDayDto[];
}
