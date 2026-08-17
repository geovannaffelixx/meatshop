import { IsEnum } from 'class-validator';
import { DeliveryMode } from '../enums/delivery-mode.enum';

export class CreateDeliveryPersonDto {
  @IsEnum(DeliveryMode)
  vehicle: DeliveryMode;
}
