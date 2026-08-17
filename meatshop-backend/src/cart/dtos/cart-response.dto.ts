import { ApiProperty } from '@nestjs/swagger';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';

export class CartItemResponseDto {
  @ApiProperty({
    description: 'Identificador do item do carrinho',
    example: 10,
  })
  id: number;

  @ApiProperty({
    description: 'Identificador do produto',
    example: 42,
  })
  product_id: number;

  @ApiProperty({
    description: 'Nome do produto',
    example: 'Picanha Bovina',
  })
  product_name: string;

  @ApiProperty({
    description: 'Quantidade do produto no carrinho',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Preço unitário do produto',
    example: 59.9,
  })
  unit_price: number;

  @ApiProperty({
    description: 'Subtotal do item (preço unitário multiplicado pela quantidade)',
    example: 119.8,
  })
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
  @ApiProperty({
    description: 'Identificador do carrinho',
    example: 5,
  })
  id: number;

  @ApiProperty({
    description: 'Itens presentes no carrinho',
    type: () => CartItemResponseDto,
    isArray: true,
  })
  items: CartItemResponseDto[];

  @ApiProperty({
    description: 'Valor total do carrinho (soma dos subtotais dos itens)',
    example: 239.6,
  })
  total: number;

  static fromEntity(cart: Cart, items: CartItem[]): CartResponseDto {
    const dto = new CartResponseDto();
    dto.id = cart.id;
    dto.items = items.map((item) => CartItemResponseDto.fromEntity(item));
    dto.total = dto.items.reduce((sum, item) => sum + item.subtotal, 0);
    return dto;
  }
}
