import {
  ArrayUnique,
  IsDateString,
  IsEnum,
  IsInt,
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
    description: 'Tipo de entrega do pedido',
    enum: DeliveryType,
    example: DeliveryType.DELIVERY,
  })
  @IsEnum(DeliveryType)
  delivery_type: DeliveryType;

  @ApiPropertyOptional({
    description: 'Id do endereço de entrega. Obrigatório quando delivery_type é DELIVERY',
    example: 12,
  })
  @ValidateIf((dto) => dto.delivery_type === DeliveryType.DELIVERY)
  @IsInt()
  address_id?: number;

  @ApiPropertyOptional({
    description: 'Código do cupom de desconto a ser aplicado no pedido',
    example: 'PROMO10',
  })
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiPropertyOptional({
    description: 'Cupons por unidade para carrinhos multiunidade',
    type: UnitCouponDto,
    isArray: true,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UnitCouponDto)
  @ArrayUnique((coupon: UnitCouponDto) => coupon.unit_id)
  coupon_codes?: UnitCouponDto[];

  @ApiPropertyOptional({
    description: 'Data e hora agendada para a entrega do pedido',
    example: '2026-08-20T18:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduled_delivery_date?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Método escolhido pelo cliente',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;
}
