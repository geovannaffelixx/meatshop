import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleOrderDto {
  @ApiProperty({
    description: 'New scheduled order delivery date and time',
    example: '2026-08-20T18:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduled_delivery_date: string;
}
