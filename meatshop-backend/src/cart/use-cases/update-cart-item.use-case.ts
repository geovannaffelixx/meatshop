import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService } from '../services/cart-access.service';
import { CartProductPolicyService } from '../services/cart-product-policy.service';
import { GetCartUseCase } from './get-cart.use-case';
import { CartResponseDto } from '../dtos/cart-response.dto';

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartAccessService: CartAccessService,
    private readonly productPolicy: CartProductPolicyService,
    private readonly getCartUseCase: GetCartUseCase,
  ) {}

  async execute(
    itemId: number,
    dto: UpdateCartItemDto,
    currentUser: User,
  ): Promise<CartResponseDto> {
    const item = await this.cartAccessService.findOwnCartItem(itemId, currentUser.id);

    const product = await this.productPolicy.validate(item.product_id, dto.quantity);
    item.quantity = dto.quantity;
    item.unit_price = Number(product.price);
    await this.cartItemRepository.save(item);
    return this.getCartUseCase.execute(currentUser);
  }
}
