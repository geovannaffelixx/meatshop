import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService } from '../services/cart-access.service';

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartAccessService: CartAccessService,
  ) {}

  async execute(
    itemId: number,
    dto: UpdateCartItemDto,
    currentUser: User,
  ): Promise<CartItem> {
    const item = await this.cartAccessService.findOwnCartItem(
      itemId,
      currentUser.id,
    );

    item.quantity = dto.quantity;
    return this.cartItemRepository.save(item);
  }
}
