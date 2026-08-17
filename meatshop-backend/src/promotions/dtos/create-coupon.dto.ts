import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({
    description: 'Código do cupom de desconto (único)',
    example: 'PROMO10',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description:
      'Percentual de desconto do cupom (obrigatório caso discount_value não seja informado)',
    example: 10,
  })
  @ValidateIf((dto) => dto.discount_value === undefined)
  @IsNotEmpty({ message: 'Either discount_percentage or discount_value is required' })
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percentage?: number;

  @ApiPropertyOptional({
    description:
      'Valor fixo de desconto do cupom (obrigatório caso discount_percentage não seja informado)',
    example: 15.5,
  })
  @ValidateIf((dto) => dto.discount_percentage === undefined)
  @IsNotEmpty({ message: 'Either discount_percentage or discount_value is required' })
  @IsNumber()
  @Min(0)
  discount_value?: number;

  @ApiProperty({
    description: 'Data e hora de expiração do cupom (ISO 8601)',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  expires_at: string;

  @ApiPropertyOptional({
    description: 'Indica se o cupom está ativo',
    example: true,
  })
  @IsOptional()
  active?: boolean;
}
