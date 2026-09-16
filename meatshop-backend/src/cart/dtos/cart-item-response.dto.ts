import { ApiProperty } from '@nestjs/swagger';
import type { CartItem } from '../entities/cart-item.entity';

export class CartItemResponseDto {
  @ApiProperty() id: number;

  @ApiProperty() product_id: number;

  @ApiProperty() product_name: string;

  @ApiProperty({ nullable: true }) product_image_url: string | null;

  @ApiProperty() unit_of_measure: string;

  @ApiProperty() unit_id: number;

  @ApiProperty() unit_name: string;

  @ApiProperty({ nullable: true }) unit_image_url: string | null;

  @ApiProperty() quantity: number;

  @ApiProperty() available_stock: number;

  @ApiProperty() unit_price: number;

  @ApiProperty() subtotal: number;

  static fromEntity(item: CartItem, availableStock: number): CartItemResponseDto {
    const dto = new CartItemResponseDto();
    dto.id = item.id;
    dto.product_id = item.product_id;
    dto.product_name = item.product.name;
    dto.product_image_url = item.product.image_url;
    dto.unit_of_measure = item.product.unit_of_measure;
    dto.unit_id = item.product.unit_id;
    dto.unit_name = item.product.unit.name;
    dto.unit_image_url = item.product.unit.image_url;
    dto.quantity = Number(item.quantity);
    dto.available_stock = availableStock;
    dto.unit_price = Number(item.unit_price);
    dto.subtotal = Number((dto.unit_price * dto.quantity).toFixed(2));
    return dto;
  }
}

export class CartUnitGroupResponseDto {
  @ApiProperty() unit_id: number;

  @ApiProperty() unit_name: string;

  @ApiProperty({ nullable: true }) unit_image_url: string | null;

  @ApiProperty({ type: () => CartItemResponseDto, isArray: true })
  items: CartItemResponseDto[];

  @ApiProperty() total: number;
}
