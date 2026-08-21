import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryType } from '../enums/delivery-type.enum';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Tipo de entrega do pedido',
    enum: DeliveryType,
    example: DeliveryType.DELIVERY,
  })
  @IsEnum(DeliveryType)
  delivery_type: DeliveryType;

  @ApiPropertyOptional({
    description:
      'Id do endereço de entrega. Obrigatório quando delivery_type é DELIVERY',
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
    description: 'Data e hora agendada para a entrega do pedido',
    example: '2026-08-20T18:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduled_delivery_date?: string;
}
