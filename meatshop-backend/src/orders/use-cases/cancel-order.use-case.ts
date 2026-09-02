import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { CouponRedemptionService } from '../../promotions/services/coupon-redemption.service';
import { Stock } from '../../products/entities/stock.entity';
import { User } from '../../users/entities/user.entity';
import { CancelOrderDto } from '../dtos/cancel-order.dto';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { CancelledBy } from '../enums/cancelled-by.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderAuthorizationService } from '../services/order-authorization.service';

const TERMINAL_STATUSES = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];

@Injectable()
export class CancelOrderUseCase {
  private readonly logger = new Logger(CancelOrderUseCase.name);

  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    private readonly authorization: OrderAuthorizationService,
    private readonly notifications: SendOrderStatusNotificationUseCase,
    private readonly coupons: CouponRedemptionService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(orderId: number, dto: CancelOrderDto, currentUser: User): Promise<Order> {
    const existing = await this.orders.findOne({ where: { id: orderId } });
    if (!existing) throw new NotFoundException('Order not found');
    const cancelledBy = await this.resolveCancelledBy(existing, currentUser);

    const cancelled = await this.dataSource.transaction(async (manager) => {
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .getOne();
      if (!order) throw new NotFoundException('Order not found');
      if (TERMINAL_STATUSES.includes(order.status)) {
        throw new BadRequestException('Order can no longer be cancelled');
      }

      const items = await manager.find(OrderItem, { where: { order_id: orderId } });
      for (const item of items) {
        await manager.increment(Stock, { product_id: item.product_id }, 'quantity', item.quantity);
      }
      order.status = OrderStatus.CANCELLED;
      order.cancellation_reason = dto.reason;
      order.cancelled_at = new Date();
      order.cancelled_by = cancelledBy;
      await manager.save(Order, order);
      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, {
          order_id: order.id,
          status: order.status,
          updated_by: currentUser.id,
        }),
      );
      await this.coupons.releaseOrder(order.id, manager);
      return order;
    });

    await this.notifications.notifyCustomerOfStatusChange(cancelled).catch((error: Error) => {
      this.logger.warn(`Failed to notify cancellation for order ${cancelled.id}: ${error.message}`);
    });
    return cancelled;
  }

  private async resolveCancelledBy(order: Order, user: User): Promise<CancelledBy> {
    if (order.client_id === user.id) return CancelledBy.CLIENT;
    await this.authorization.assertCanManageOrder(order, user);
    return CancelledBy.UNIT;
  }
}
