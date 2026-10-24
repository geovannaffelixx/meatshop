import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { BusinessHoursDayDto } from './business-hours-day.dto';
import { CreateUnitDto } from './create-unit.dto';

export class SetBusinessHoursDto extends PickType(CreateUnitDto, [
  'scheduling_slot_minutes',
  'scheduling_capacity',
] as const) {
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
