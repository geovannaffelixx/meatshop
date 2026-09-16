import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AddCartItemDto } from '../dtos/add-cart-item.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService } from '../services/cart-access.service';
import { CartProductPolicyService } from '../services/cart-product-policy.service';
import { GetCartUseCase } from './get-cart.use-case';
import { CartResponseDto } from '../dtos/cart-response.dto';

@Injectable()
export class AddItemToCartUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartAccessService: CartAccessService,
    private readonly productPolicy: CartProductPolicyService,
    private readonly getCartUseCase: GetCartUseCase,
  ) {}

  async execute(dto: AddCartItemDto, currentUser: User): Promise<CartResponseDto> {
    const cart = await this.cartAccessService.getOrCreateCart(currentUser.id);

    const existingItem = await this.cartItemRepository.findOne({
      where: { cart_id: cart.id, product_id: dto.product_id },
    });

    if (existingItem) {
      const desiredQuantity = Number(existingItem.quantity) + dto.quantity;
      const product = await this.productPolicy.validate(dto.product_id, desiredQuantity);
      existingItem.quantity = desiredQuantity;
      existingItem.unit_price = Number(product.price);
      await this.cartItemRepository.save(existingItem);
      return this.getCartUseCase.execute(currentUser);
    }

    const product = await this.productPolicy.validate(dto.product_id, dto.quantity);

    const item = this.cartItemRepository.create({
      cart_id: cart.id,
      product_id: dto.product_id,
      quantity: dto.quantity,
      unit_price: product.price,
    });

    await this.cartItemRepository.save(item);
    return this.getCartUseCase.execute(currentUser);
  }
}
