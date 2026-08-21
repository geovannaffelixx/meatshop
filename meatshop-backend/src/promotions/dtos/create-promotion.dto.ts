import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePromotionDto {
  @ApiProperty({
    description: 'Identificador da unidade à qual a promoção pertence',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  unit_id: number;

  @ApiProperty({
    description: 'Identificador do produto em promoção',
    example: 42,
  })
  @IsNotEmpty()
  @IsInt()
  product_id: number;

  @ApiProperty({
    description: 'Título da promoção',
    example: 'Picanha em promoção',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da promoção',
    example: 'Picanha bovina com 20% de desconto durante o fim de semana',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Percentual de desconto aplicado ao produto (obrigatório caso promotional_price não seja informado)',
    example: 20,
  })
  @ValidateIf((dto) => dto.promotional_price === undefined)
  @IsNotEmpty({ message: 'Either discount_percentage or promotional_price is required' })
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percentage?: number;

  @ApiPropertyOptional({
    description:
      'Preço promocional do produto (obrigatório caso discount_percentage não seja informado)',
    example: 47.92,
  })
  @ValidateIf((dto) => dto.discount_percentage === undefined)
  @IsNotEmpty({ message: 'Either discount_percentage or promotional_price is required' })
  @IsNumber()
  @Min(0)
  promotional_price?: number;

  @ApiProperty({
    description: 'Data e hora de início da promoção (ISO 8601)',
    example: '2026-08-20T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  starts_at: string;

  @ApiProperty({
    description: 'Data e hora de término da promoção (ISO 8601)',
    example: '2026-08-25T23:59:59.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  ends_at: string;
}
