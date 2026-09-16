import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AssignDeliveryPersonDto {
  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  deliveryPersonId: number;
}
