import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { DeliveryType } from '../enums/delivery-type.enum';

export class CreateOrderDto {
  @IsEnum(DeliveryType)
  delivery_type: DeliveryType;

  @ValidateIf((dto) => dto.delivery_type === DeliveryType.DELIVERY)
  @IsInt()
  address_id?: number;

  @IsOptional()
  @IsString()
  coupon_code?: string;

  @IsOptional()
  @IsDateString()
  scheduled_delivery_date?: string;
}
