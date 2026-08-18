import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { BusinessHoursDayDto } from './business-hours-day.dto';

export class SetBusinessHoursDto {
  @ApiProperty({
    description:
      'Horários da unidade. Cada dia informado substitui o horário existente para aquele dia; dias não informados permanecem inalterados.',
    type: [BusinessHoursDayDto],
  })
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDayDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  days: BusinessHoursDayDto[];
}
