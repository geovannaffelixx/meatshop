import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Picanha',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Detailed product description',
    example: 'Premium beef cut, ideal for barbecue',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Product sale price',
    example: 89.9,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Product unit of measure',
    example: 'KG',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  unit_of_measure: string;

  @ApiPropertyOptional({
    description: 'Indicates whether the product is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Unit identifier that owns the product',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  unit_id: number;

  @ApiProperty({
    description: 'Category identifier that owns the product',
    example: 3,
  })
  @IsNotEmpty()
  @IsInt()
  category_id: number;

  @ApiPropertyOptional({
    description: 'Product brand',
    example: 'Friboi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({
    description: 'Product image URL',
    example: 'https://cdn.example.com/products/picanha.jpg',
  })
  @IsOptional()
  @IsUrl()
  image_url?: string;
}
