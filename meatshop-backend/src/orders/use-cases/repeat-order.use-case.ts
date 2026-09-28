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
        const product = await manager.findOneBy(Product, { id: item.product_id });
        const stock = await manager.findOneBy(Stock, { product_id: item.product_id });
        const existing = await manager.findOneBy(CartItem, {
          cart_id: cart.id,
          product_id: item.product_id,
        });
        const quantity = Math.max(Number(item.quantity), Number(existing?.quantity ?? 0));
        if (!product?.active || !stock || Number(stock.quantity) < quantity) {
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
      // Review prices, address and payment before creating another order.
      return { cart_updated: true, skippedItems };
    });
  }
}
