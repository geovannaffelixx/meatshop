import { PaymentLifecycleService } from '../../payments/payment-lifecycle.service';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
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
    private readonly payments: PaymentLifecycleService,
  ) {}

  async execute(orderId: number, dto: CancelOrderDto, currentUser: User): Promise<Order> {
    const existing = await this.orders.findOne({ where: { id: orderId } });
    if (!existing) throw new NotFoundException('Order not found');
    const cancelledBy = await this.resolveCancelledBy(existing, currentUser);

    const cancelled = await this.dataSource.transaction((manager) =>
      this.cancelInTransaction(manager, orderId, dto, currentUser, cancelledBy),
    );

    await this.notifications.notifyCustomerOfStatusChange(cancelled).catch((error: Error) => {
      this.logger.warn(`Failed to notify cancellation for order ${cancelled.id}: ${error.message}`);
    });
    return cancelled;
  }

  private async cancelInTransaction(
    manager: EntityManager,
    orderId: number,
    dto: CancelOrderDto,
    user: User,
    cancelledBy: CancelledBy,
  ): Promise<Order> {
    const order = await this.loadCancellableOrder(manager, orderId, cancelledBy);
    this.applyCancellation(order, dto, cancelledBy);
    await this.recordCancellation(manager, order, user.id);
    await this.coupons.releaseOrder(order.id, manager);
    await this.cancelPayment(manager, order, dto, user.id);
    await this.restoreStock(manager, order);
    return order;
  }

  private async loadCancellableOrder(
    manager: EntityManager,
    orderId: number,
    cancelledBy: CancelledBy,
  ): Promise<Order> {
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
    if (
      cancelledBy === CancelledBy.CLIENT &&
      ![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)
    )
      throw new BadRequestException({
        code: 'CANCELLATION_REQUIRES_SUPPORT',
        message: 'O pedido já está em preparo. Solicite o cancelamento ao açougue.',
      });
    return order;
  }

  private applyCancellation(order: Order, dto: CancelOrderDto, cancelledBy: CancelledBy): void {
    order.status = OrderStatus.CANCELLED;
    order.delivery_status = null;
    order.delivery_step = null;
    order.tracking_session_id = null;
    order.tracking_revoked_at = new Date();
    order.cancellation_reason = dto.reason;
    order.cancelled_at = new Date();
    order.cancelled_by = cancelledBy;
  }

  private async recordCancellation(
    manager: EntityManager,
    order: Order,
    userId: number,
  ): Promise<void> {
    await manager.save(Order, order);
    await manager.save(
      OrderStatusHistory,
      manager.create(OrderStatusHistory, {
        order_id: order.id,
        status: order.status,
        updated_by: userId,
      }),
    );
  }

  private async cancelPayment(
    manager: EntityManager,
    order: Order,
    dto: CancelOrderDto,
    userId: number,
  ): Promise<void> {
    const payment = await manager.findOne(Payment, {
      where: { order_id: order.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (
      payment?.transaction_id &&
      [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)
    ) {
      payment.refund_status = await this.payments.queueRefund(
        manager,
        payment.transaction_id,
        order.id,
        Number(order.total_amount) - Number(payment.refunded_amount),
        dto.reason,
        userId,
        order.unit_id,
      );
      await manager.save(payment);
    } else if (
      payment &&
      [PaymentStatus.PENDING, PaymentStatus.REJECTED, PaymentStatus.CANCELLED].includes(
        payment.status,
      )
    ) {
      payment.status = PaymentStatus.CANCELLED;
      order.payment_status = PaymentStatus.CANCELLED;
      await manager.save(payment);
      await manager.save(Order, order);
    }
  }

  private async restoreStock(manager: EntityManager, order: Order): Promise<void> {
    const items = await manager.find(OrderItem, {
      where: { order_id: order.id },
      order: { product_id: 'ASC' },
    });
    for (const item of items) {
      await manager.increment(Stock, { product_id: item.product_id }, 'quantity', item.quantity);
    }
  }

  private async resolveCancelledBy(order: Order, user: User): Promise<CancelledBy> {
    if (order.client_id === user.id) return CancelledBy.CLIENT;
    await this.authorization.assertCanManageOrder(order, user);
    return CancelledBy.UNIT;
  }
}
