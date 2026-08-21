import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';

export class ProductListItemDto {
  @ApiProperty({ description: 'Id do produto', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome do produto', example: 'Picanha' })
  name: string;

  @ApiProperty({ description: 'Id da categoria do produto', example: 3 })
  category_id: number;

  @ApiPropertyOptional({ description: 'Nome da categoria do produto', example: 'Bovinos', nullable: true })
  category_name: string | null;

  @ApiPropertyOptional({ description: 'Marca do produto', example: 'Friboi', nullable: true })
  brand: string | null;

  @ApiProperty({ description: 'Unidade de medida do produto', example: 'KG' })
  unit_of_measure: string;

  @ApiProperty({ description: 'Preço de venda do produto', example: 89.9 })
  price: number;

  @ApiProperty({ description: 'Indica se o produto está ativo', example: true })
  active: boolean;

  @ApiProperty({ description: 'Quantidade em estoque', example: 25 })
  stock_quantity: number;

  @ApiProperty({ description: 'Quantidade mínima antes do alerta de estoque baixo', example: 5 })
  stock_min_quantity: number;

  static fromEntity(product: Product, stock: Stock | null): ProductListItemDto {
    const dto = new ProductListItemDto();
    dto.id = product.id;
    dto.name = product.name;
    dto.category_id = product.category_id;
    dto.category_name = product.category?.name ?? null;
    dto.brand = product.brand;
    dto.unit_of_measure = product.unit_of_measure;
    dto.price = Number(product.price);
    dto.active = product.active;
    dto.stock_quantity = stock?.quantity ?? 0;
    dto.stock_min_quantity = stock?.min_quantity ?? 0;
    return dto;
  }
}
