import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { AddCartItemDto } from '../dtos/add-cart-item.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService } from '../services/cart-access.service';

@Injectable()
export class AddItemToCartUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cartAccessService: CartAccessService,
  ) {}

  async execute(dto: AddCartItemDto, currentUser: User): Promise<CartItem> {
    const product = await this.productRepository.findOne({
      where: { id: dto.product_id },
    });
    if (!product || !product.active) {
      throw new NotFoundException('Product not available');
    }

    const cart = await this.cartAccessService.getOrCreateCart(currentUser.id);

    const existingItem = await this.cartItemRepository.findOne({
      where: { cart_id: cart.id, product_id: dto.product_id },
    });

    if (existingItem) {
      existingItem.quantity += dto.quantity;
      return this.cartItemRepository.save(existingItem);
    }

    const item = this.cartItemRepository.create({
      cart_id: cart.id,
      product_id: dto.product_id,
      quantity: dto.quantity,
      unit_price: product.price,
    });

    return this.cartItemRepository.save(item);
  }
}
