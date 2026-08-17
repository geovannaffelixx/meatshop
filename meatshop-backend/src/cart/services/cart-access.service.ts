import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';

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

    return this.cartRepository.save(
      this.cartRepository.create({ user_id: userId }),
    );
  }

  async findOwnCartItem(itemId: number, userId: number): Promise<CartItem> {
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId },
      relations: ['cart'],
    });

    if (!item || item.cart.user_id !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    return item;
  }
}
