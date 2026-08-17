import { IsIn } from 'class-validator';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';

export class UpdateDeliveryStatusDto {
  @IsIn([DeliveryStatus.ON_THE_WAY])
  delivery_status: DeliveryStatus;
}
