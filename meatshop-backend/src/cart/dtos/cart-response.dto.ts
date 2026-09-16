import { ApiProperty } from '@nestjs/swagger';
import type { Cart } from '../entities/cart.entity';
import type { CartItem } from '../entities/cart-item.entity';
import { CartItemResponseDto, CartUnitGroupResponseDto } from './cart-item-response.dto';

export class CartResponseDto {
  @ApiProperty() id: number;

  @ApiProperty({ type: () => CartItemResponseDto, isArray: true })
  items: CartItemResponseDto[];

  @ApiProperty({ type: () => CartUnitGroupResponseDto, isArray: true })
  groups: CartUnitGroupResponseDto[];

  @ApiProperty() total: number;

  static fromEntity(
    cart: Cart,
    items: CartItem[],
    stockByProductId: ReadonlyMap<number, number>,
  ): CartResponseDto {
    const dto = new CartResponseDto();
    dto.id = cart.id;
    dto.items = items.map((item) =>
      CartItemResponseDto.fromEntity(item, stockByProductId.get(item.product_id) ?? 0),
    );
    const grouped = new Map<number, CartUnitGroupResponseDto>();
    for (const item of dto.items) {
      const group = grouped.get(item.unit_id) ?? {
        unit_id: item.unit_id,
        unit_name: item.unit_name,
        unit_image_url: item.unit_image_url,
        items: [],
        total: 0,
      };
      group.items.push(item);
      group.total = Number((group.total + item.subtotal).toFixed(2));
      grouped.set(item.unit_id, group);
    }
    dto.groups = [...grouped.values()];
    dto.total = Number(dto.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
    return dto;
  }
}
