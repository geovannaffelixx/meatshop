import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';

export class ProductListItemDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Product name', example: 'Picanha' })
  name: string;

  @ApiPropertyOptional({ nullable: true }) description: string | null;

  @ApiProperty() unit_id: number;

  @ApiPropertyOptional({ nullable: true }) unit_name: string | null;

  @ApiProperty({ description: 'Product category ID', example: 3 })
  category_id: number;

  @ApiPropertyOptional({
    description: 'Product category name',
    example: 'Beefs',
    nullable: true,
  })
  category_name: string | null;

  @ApiPropertyOptional({
    description: 'Product brand',
    example: 'Friboi',
    nullable: true,
  })
  brand: string | null;

  @ApiPropertyOptional({ nullable: true }) image_url: string | null;

  @ApiProperty({ description: 'Product unit of measure', example: 'KG' })
  unit_of_measure: string;

  @ApiProperty({ description: 'Product sale price', example: 89.9 })
  price: number;

  @ApiProperty({
    description: 'Indicates whether the product is active',
    example: true,
  })
  active: boolean;

  @ApiProperty({ description: 'Stock quantity', example: 25 })
  stock_quantity: number;

  @ApiProperty({
    description: 'Minimum quantity before a low-stock alert',
    example: 5,
  })
  stock_min_quantity: number;

  static fromEntity(product: Product, stock: Stock | null): ProductListItemDto {
    const dto = new ProductListItemDto();
    dto.id = product.id;
    dto.name = product.name;
    dto.description = product.description;
    dto.unit_id = product.unit_id;
    dto.unit_name = product.unit?.name ?? null;
    dto.category_id = product.category_id;
    dto.category_name = product.category?.name ?? null;
    dto.brand = product.brand;
    dto.image_url = product.image_url;
    dto.unit_of_measure = product.unit_of_measure;
    dto.price = Number(product.price);
    dto.active = product.active;
    dto.stock_quantity = stock?.quantity ?? 0;
    dto.stock_min_quantity = stock?.min_quantity ?? 0;
    return dto;
  }
}
