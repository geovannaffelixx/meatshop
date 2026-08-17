import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService } from '../services/cart-access.service';

@Injectable()
export class ClearCartUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartAccessService: CartAccessService,
  ) {}

  async execute(currentUser: User): Promise<void> {
    const cart = await this.cartAccessService.getOrCreateCart(currentUser.id);
    await this.cartItemRepository.delete({ cart_id: cart.id });
  }
}
