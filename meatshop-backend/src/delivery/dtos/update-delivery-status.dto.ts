import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    description: 'Novo status da entrega. Atualmente somente a transição para ON_THE_WAY é permitida por este endpoint',
    enum: DeliveryStatus,
    example: DeliveryStatus.ON_THE_WAY,
  })
  @IsIn([DeliveryStatus.ON_THE_WAY])
  delivery_status: DeliveryStatus;
}
