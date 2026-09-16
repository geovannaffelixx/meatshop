import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CartResponseDto } from '../dtos/cart-response.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartAccessService } from '../services/cart-access.service';
import { Stock } from '../../products/entities/stock.entity';
import { In } from 'typeorm';

@Injectable()
export class GetCartUseCase {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly cartAccessService: CartAccessService,
  ) {}

  async execute(currentUser: User): Promise<CartResponseDto> {
    const cart = await this.cartAccessService.getOrCreateCart(currentUser.id);

    const items = await this.cartItemRepository.find({
      where: { cart_id: cart.id },
      relations: ['product', 'product.unit'],
    });
    const productIds = items.map((item) => item.product_id);
    const stocks = productIds.length
      ? await this.stockRepository.find({
          where: { product_id: In(productIds) },
        })
      : [];
    const stockByProductId = new Map(
      stocks.map((stock) => [stock.product_id, Number(stock.quantity)]),
    );
    return CartResponseDto.fromEntity(cart, items, stockByProductId);
  }
}
