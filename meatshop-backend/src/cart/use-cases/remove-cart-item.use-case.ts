import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService } from '../services/cart-access.service';
import { GetCartUseCase } from './get-cart.use-case';
import { CartResponseDto } from '../dtos/cart-response.dto';

@Injectable()
export class RemoveCartItemUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartAccessService: CartAccessService,
    private readonly getCartUseCase: GetCartUseCase,
  ) {}

  async execute(itemId: number, currentUser: User): Promise<CartResponseDto> {
    const item = await this.cartAccessService.findOwnCartItem(itemId, currentUser.id);

    await this.cartItemRepository.remove(item);
    return this.getCartUseCase.execute(currentUser);
  }
}
