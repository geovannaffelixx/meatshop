import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';

export class CartItemResponseDto {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;

  static fromEntity(item: CartItem): CartItemResponseDto {
    const dto = new CartItemResponseDto();
    dto.id = item.id;
    dto.product_id = item.product_id;
    dto.product_name = item.product?.name;
    dto.quantity = item.quantity;
    dto.unit_price = Number(item.unit_price);
    dto.subtotal = Number(item.unit_price) * item.quantity;
    return dto;
  }
}

export class CartResponseDto {
  id: number;
  items: CartItemResponseDto[];
  total: number;

  static fromEntity(cart: Cart, items: CartItem[]): CartResponseDto {
    const dto = new CartResponseDto();
    dto.id = cart.id;
    dto.items = items.map((item) => CartItemResponseDto.fromEntity(item));
    dto.total = dto.items.reduce((sum, item) => sum + item.subtotal, 0);
    return dto;
  }
}
