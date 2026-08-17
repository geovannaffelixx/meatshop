import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CartResponseDto } from '../dtos/cart-response.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService } from '../services/cart-access.service';

@Injectable()
export class GetCartUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartAccessService: CartAccessService,
  ) {}

  async execute(currentUser: User): Promise<CartResponseDto> {
    const cart = await this.cartAccessService.getOrCreateCart(currentUser.id);

    const items = await this.cartItemRepository.find({
      where: { cart_id: cart.id },
      relations: ['product'],
    });

    return CartResponseDto.fromEntity(cart, items);
  }
}
