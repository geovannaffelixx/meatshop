import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleOrderDto {
  @ApiProperty({
    description: 'Nova data e hora agendada para a entrega do pedido',
    example: '2026-08-20T18:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduled_delivery_date: string;
}
