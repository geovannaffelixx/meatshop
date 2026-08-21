import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryMode } from '../enums/delivery-mode.enum';

export class CreateDeliveryPersonDto {
  @ApiProperty({
    description: 'Modalidade de veículo utilizada pelo entregador',
    enum: DeliveryMode,
    example: DeliveryMode.MOTORCYCLE,
  })
  @IsEnum(DeliveryMode)
  vehicle: DeliveryMode;
}
