import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';
import { Stock } from '../../products/entities/stock.entity';

export type CartPurchaseItem = CartItem & { stock?: Stock | null };

const CART_UPDATE_COLUMNS = [
  'item.id',
  'item.cart_id',
  'item.product_id',
  'item.quantity',
  'item.unit_price',
  'cart.id',
  'cart.user_id',
  'product.id',
  'product.price',
  'product.active',
  'product.unit_id',
  'product.category_id',
  'product.unit_of_measure',
  'category.id',
  'category.active',
  'unit.id',
  'unit.is_active',
  'stock.id',
  'stock.quantity',
];

@Injectable()
export class CartAccessService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
  ) {}

  async getOrCreateCart(userId: number): Promise<Cart> {
    const existing = await this.cartRepository.findOne({
      where: { user_id: userId },
    });
    if (existing) {
      return existing;
    }

    return this.cartRepository.save(this.cartRepository.create({ user_id: userId }));
  }

  async findOwnCartItem(itemId: number, userId: number): Promise<CartItem> {
    const [item] = await this.cartItemRepository.find({
      where: { id: itemId },
      relations: ['cart'],
    });

    if (!item || item.cart.user_id !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    return item;
  }

  async findOwnCartItemForUpdate(itemId: number, userId: number): Promise<CartPurchaseItem> {
    const item = await this.cartItemRepository
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.cart', 'cart')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.unit', 'unit')
      .leftJoinAndMapOne('item.stock', Stock, 'stock', 'stock.product_id = item.product_id')
      .select(CART_UPDATE_COLUMNS)
      .where('item.id = :itemId AND cart.user_id = :userId', { itemId, userId })
      .getOne();
    if (!item) throw new NotFoundException('Cart item not found');
    return item as CartPurchaseItem;
  }
}
