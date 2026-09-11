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
    description: 'Unit identifier that owns the promotion',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  unit_id: number;

  @ApiProperty({
    description: 'Promoted product identifier',
    example: 42,
  })
  @IsNotEmpty()
  @IsInt()
  product_id: number;

  @ApiProperty({
    description: 'Promotion title',
    example: 'Picanha promotion',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed promotion description',
    example: 'Beef picanha with a 20% weekend discount',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Discount percentage applied to the product (required when promotional_price is not provided)',
    example: 20,
  })
  @ValidateIf((dto) => dto.promotional_price === undefined)
  @IsNotEmpty({
    message: 'Either discount_percentage or promotional_price is required',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percentage?: number;

  @ApiPropertyOptional({
    description: 'Product promotional price (required when discount_percentage is not provided)',
    example: 47.92,
  })
  @ValidateIf((dto) => dto.discount_percentage === undefined)
  @IsNotEmpty({
    message: 'Either discount_percentage or promotional_price is required',
  })
  @IsNumber()
  @Min(0)
  promotional_price?: number;

  @ApiProperty({
    description: 'Promotion start date and time (ISO 8601)',
    example: '2026-08-20T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  starts_at: string;

  @ApiProperty({
    description: 'Promotion end date and time (ISO 8601)',
    example: '2026-08-25T23:59:59.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  ends_at: string;
}
