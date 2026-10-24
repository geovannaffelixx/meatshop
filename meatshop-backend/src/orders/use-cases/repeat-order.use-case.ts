import {
  isPurchasableProduct,
  isValidProductQuantity,
  hasSufficientStock,
} from '../../cart/services/product-availability.policy';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartAccessService } from '../../cart/services/cart-access.service';
import { Cart } from '../../cart/entities/cart.entity';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { Product } from '../../products/entities/product.entity';
import { Stock } from '../../products/entities/stock.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderAuthorizationService } from '../services/order-authorization.service';

@Injectable()
export class RepeatOrderUseCase {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly carts: CartAccessService,
    private readonly authorization: OrderAuthorizationService,
  ) {}

  async execute(orderId: number, user: User) {
    const order = await this.orders.findOneBy({ id: orderId });
    if (!order) throw new NotFoundException('Order not found');
    this.authorization.assertOwnsOrder(order, user);
    const cart = await this.carts.getOrCreateCart(user.id);
    return this.orders.manager.transaction(async (manager) => {
      await manager.findOneOrFail(Cart, {
        where: { id: cart.id },
        lock: { mode: 'pessimistic_write' },
      });
      const items = await manager.find(OrderItem, { where: { order_id: orderId } });
      const skippedItems: string[] = [];
      let added = 0;
      for (const item of items) {
        const product = await manager.findOne(Product, {
          where: { id: item.product_id },
          relations: ['category'],
        });
        const stock = await manager.findOneBy(Stock, { product_id: item.product_id });
        const existing = await manager.findOneBy(CartItem, {
          cart_id: cart.id,
          product_id: item.product_id,
        });
        const quantity = Math.max(Number(item.quantity), Number(existing?.quantity ?? 0));
        if (
          !isPurchasableProduct(product) ||
          !isValidProductQuantity(product, quantity) ||
          !hasSufficientStock(Number(stock?.quantity ?? 0), quantity)
        ) {
          skippedItems.push(product?.name ?? `Product #${item.product_id}`);
          continue;
        }
        await manager.save(
          CartItem,
          manager.create(CartItem, {
            ...existing,
            cart_id: cart.id,
            product_id: product.id,
            quantity,
            unit_price: product.price,
          }),
        );
        added++;
      }
      if (!added) throw new BadRequestException('None of the items are currently available');
      return { cart_updated: true, skippedItems };
    });
  }
}
