import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService } from '../services/cart-access.service';
import { CartProductPolicyService } from '../services/cart-product-policy.service';
import { CartResponseDto } from '../dtos/cart-response.dto';

type CartReadRow = CartItem & { available_stock: string | number };

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartAccessService: CartAccessService,
    private readonly productPolicy: CartProductPolicyService,
  ) {}

  async execute(
    itemId: number,
    dto: UpdateCartItemDto,
    currentUser: User,
  ): Promise<CartResponseDto> {
    const item = await this.cartAccessService.findOwnCartItemForUpdate(itemId, currentUser.id);

    const product = this.productPolicy.validateLoaded(
      item.product,
      Number(item.stock?.quantity ?? 0),
      dto.quantity,
    );
    const items = await this.updateAndReadCart(
      item.id,
      dto.quantity,
      Number(product.price),
      currentUser.id,
    );
    if (!items.length) throw new NotFoundException('Cart item not found');
    return CartResponseDto.fromEntity(
      item.cart,
      items,
      new Map(items.map((row) => [row.product_id, Number(row.available_stock)])),
    );
  }

  private updateAndReadCart(
    itemId: number,
    quantity: number,
    price: number,
    userId: number,
  ): Promise<CartReadRow[]> {
    // A modifying CTE shares the SELECT snapshot; overlay RETURNING so the response includes the new values.
    return this.cartItemRepository.query(
      `WITH changed AS (
        UPDATE cart_items SET quantity=$1,unit_price=$2 WHERE id=$3
        AND EXISTS(SELECT 1 FROM cart WHERE cart.id=cart_items.cart_id AND cart.user_id=$4)
        RETURNING id,cart_id,quantity,unit_price)
      SELECT item.id,item.cart_id,item.product_id,
        CASE WHEN item.id=changed.id THEN changed.quantity ELSE item.quantity END AS quantity,
        CASE WHEN item.id=changed.id THEN changed.unit_price ELSE item.unit_price END AS unit_price,
        COALESCE(stock.quantity,0) AS available_stock,
        jsonb_build_object('name',product.name,'unit_id',product.unit_id,
          'unit_of_measure',product.unit_of_measure,'image_url',product.image_url,
          'unit',jsonb_build_object('name',unit.name,'image_url',unit.image_url)) AS product
      FROM changed JOIN cart_items item ON item.cart_id=changed.cart_id
      JOIN products product ON product.id=item.product_id JOIN units unit ON unit.id=product.unit_id
      LEFT JOIN stock ON stock.product_id=product.id ORDER BY item.id`,
      [quantity, price, itemId, userId],
    );
  }
}
