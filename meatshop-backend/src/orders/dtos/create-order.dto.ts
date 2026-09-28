import {
  ArrayUnique,
  IsDateString,
  IsEnum,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DeliveryType } from '../enums/delivery-type.enum';
import { PaymentMethod } from '../enums/payment-method.enum';

export class UnitCouponDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  unit_id: number;

  @ApiProperty({ example: 'PROMO10' })
  @IsString()
  code: string;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Order delivery type',
    enum: DeliveryType,
    example: DeliveryType.DELIVERY,
  })
  @IsEnum(DeliveryType)
  delivery_type: DeliveryType;

  @ApiPropertyOptional({
    description: 'Delivery address ID. Required when delivery_type is DELIVERY',
    example: 12,
  })
  @ValidateIf((dto) => dto.delivery_type === DeliveryType.DELIVERY)
  @IsInt()
  address_id?: number;

  @ApiPropertyOptional({
    description: 'Discount coupon code to apply to the order',
    example: 'PROMO10',
  })
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiPropertyOptional({
    description: 'Coupons by unit for multi-unit carts',
    type: UnitCouponDto,
    isArray: true,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UnitCouponDto)
  @ArrayUnique((coupon: UnitCouponDto) => coupon.unit_id)
  coupon_codes?: UnitCouponDto[];

  @ApiPropertyOptional({
    description: 'Scheduled order delivery date and time',
    example: '2026-08-20T18:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduled_delivery_date?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Payment method selected by the customer',
  })
  @IsOptional()
  @IsIn([
    PaymentMethod.PIX,
    PaymentMethod.CREDIT,
    PaymentMethod.DEBIT,
    PaymentMethod.CASH,
    PaymentMethod.CARD_ON_DELIVERY,
  ])
  payment_method?: PaymentMethod;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  change_for?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expected_total?: number;
}
