import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CartAccessService } from '../../cart/services/cart-access.service';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { Product } from '../../products/entities/product.entity';
import { Stock } from '../../products/entities/stock.entity';
import { User } from '../../users/entities/user.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { OrderResponseDto } from '../dtos/order-response.dto';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderAuthorizationService } from '../services/order-authorization.service';
import { CreateOrderUseCase } from './create-order.use-case';

export interface IRepeatOrderResult {
  orders: OrderResponseDto[];
  checkout_id: string;
  skippedItems: string[];
}

@Injectable()
export class RepeatOrderUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly cartAccessService: CartAccessService,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly createOrderUseCase: CreateOrderUseCase,
  ) {}

  async execute(orderId: number, currentUser: User): Promise<IRepeatOrderResult> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.orderAuthorizationService.assertOwnsOrder(order, currentUser);

    const cart = await this.cartAccessService.getOrCreateCart(currentUser.id);
    await this.cartItemRepository.delete({ cart_id: cart.id });

    const skippedItems = await this.rebuildCart(orderId, cart.id);
    if (skippedItems === null) {
      throw new BadRequestException('None of the items are currently available');
    }

    const dto: CreateOrderDto = {
      delivery_type: order.delivery_type,
      address_id: order.address_id ?? undefined,
    };
    const checkout = await this.createOrderUseCase.execute(dto, currentUser, randomUUID());

    return {
      orders: checkout.orders,
      checkout_id: checkout.checkout_id,
      skippedItems,
    };
  }

  private async rebuildCart(orderId: number, cartId: number): Promise<string[] | null> {
    const items = await this.orderItemRepository.find({
      where: { order_id: orderId },
    });
    const skipped: string[] = [];
    let addedAny = false;

    for (const item of items) {
      const product = await this.productRepository.findOne({
        where: { id: item.product_id },
      });
      const available = await this.isAvailable(product, item.quantity);

      if (!product || !available) {
        skipped.push(product?.name ?? `product #${item.product_id}`);
        continue;
      }

      await this.cartItemRepository.save(
        this.cartItemRepository.create({
          cart_id: cartId,
          product_id: product.id,
          quantity: item.quantity,
          unit_price: product.price,
        }),
      );
      addedAny = true;
    }

    return addedAny ? skipped : null;
  }

  private async isAvailable(product: Product | null, quantity: number): Promise<boolean> {
    if (!product || !product.active) return false;
    const stock = await this.stockRepository.findOne({
      where: { product_id: product.id },
    });
    return !!stock && stock.quantity >= quantity;
  }
}
