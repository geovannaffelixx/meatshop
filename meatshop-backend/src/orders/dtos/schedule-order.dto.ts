import { IsDateString, IsNotEmpty } from 'class-validator';

export class ScheduleOrderDto {
  @IsNotEmpty()
  @IsDateString()
  scheduled_delivery_date: string;
}
