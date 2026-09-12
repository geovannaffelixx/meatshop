import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../entities/order.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';

@Injectable()
export class OrderStatusService {
  private readonly logger = new Logger(OrderStatusService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderStatusHistory)
    private readonly orderStatusHistoryRepository: Repository<OrderStatusHistory>,
    private readonly sendOrderStatusNotificationUseCase: SendOrderStatusNotificationUseCase,
  ) {}

  async transition(order: Order, status: OrderStatus, updatedBy: number | null): Promise<Order> {
    await this.orderRepository.manager.transaction(async (manager) => {
      const current = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .addSelect('order.tracking_session_id')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: order.id })
        .getOne();
      if (
        !current ||
        current.status !== order.status ||
        [OrderStatus.CANCELLED, OrderStatus.DELIVERED].includes(current.status) ||
        current.delivery_person_id !== order.delivery_person_id
      ) {
        throw new ConflictException('Order changed; refresh before continuing');
      }
      // A status transition must not restore consent revoked by a concurrent request.
      order.tracking_consent_at = current.tracking_consent_at;
      order.tracking_consent_user_id = current.tracking_consent_user_id;
      order.tracking_revoked_at = current.tracking_revoked_at;
      order.tracking_session_id = current.tracking_session_id;
      order.status = status;
      if ([OrderStatus.CANCELLED, OrderStatus.DELIVERED].includes(status)) {
        order.tracking_session_id = null;
        order.tracking_revoked_at = new Date();
        order.delivery_step = null;
      }
      await manager.save(Order, order);
      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, {
          order_id: order.id,
          status,
          updated_by: updatedBy,
        }),
      );
    });

    await this.sendOrderStatusNotificationUseCase
      .notifyCustomerOfStatusChange(order)
      .catch((error) =>
        this.logger.warn(
          `Failed to notify customer of order ${order.id} status change: ${error.message}`,
        ),
      );

    return order;
  }
}
