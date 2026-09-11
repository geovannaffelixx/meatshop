import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    description:
      'New delivery status. Currently only the transition to ON_THE_WAY is allowed by this endpoint',
    enum: DeliveryStatus,
    example: DeliveryStatus.ON_THE_WAY,
  })
  @IsIn([DeliveryStatus.ON_THE_WAY])
  delivery_status: DeliveryStatus;
}
