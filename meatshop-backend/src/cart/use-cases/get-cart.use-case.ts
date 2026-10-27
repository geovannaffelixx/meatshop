import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CartResponseDto } from '../dtos/cart-response.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService, type CartPurchaseItem } from '../services/cart-access.service';
import { Stock } from '../../products/entities/stock.entity';
import { PromotionalPriceService } from '../../promotions/services/promotional-price.service';
import { Cart } from '../entities/cart.entity';

const CART_READ_COLUMNS = [
  'item.id',
  'item.cart_id',
  'item.product_id',
  'item.quantity',
  'item.unit_price',
  'product.id',
  'product.name',
  'product.price',
  'product.image_url',
  'product.unit_of_measure',
  'product.unit_id',
  'unit.id',
  'unit.name',
  'unit.image_url',
  'stock.id',
  'stock.quantity',
];

@Injectable()
export class GetCartUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartAccessService: CartAccessService,
    private readonly promotionalPrice: PromotionalPriceService,
  ) {}

  async execute(currentUser: User, knownCart?: Cart): Promise<CartResponseDto> {
    const cart =
      knownCart?.user_id === currentUser.id
        ? knownCart
        : await this.cartAccessService.getOrCreateCart(currentUser.id);

    const items = (await this.cartItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('product.unit', 'unit')
      .leftJoinAndMapOne('item.stock', Stock, 'stock', 'stock.product_id = item.product_id')
      .select(CART_READ_COLUMNS)
      .where('item.cart_id = :cartId', { cartId: cart.id })
      .getMany()) as CartPurchaseItem[];
    await this.promotionalPrice.applyCurrentPrices(items);
    const stockByProductId = new Map(
      items.map((item) => [item.product_id, Number(item.stock?.quantity ?? 0)]),
    );
    return CartResponseDto.fromEntity(cart, items, stockByProductId);
  }
}
