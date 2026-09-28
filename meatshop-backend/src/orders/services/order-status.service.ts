import { assertPaymentAllowsPreparation } from '../../payments/payment-policy';
import { Payment } from '../entities/payment.entity';
import { BadRequestException } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
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
    order = await this.orderRepository.manager.transaction(async (manager) => {
      const current = await manager.findOneOrFail(Order, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (current.status !== order.status)
        throw new BadRequestException('Order changed; refresh before continuing');
      const payment = await manager.findOne(Payment, { where: { order_id: current.id } });
      assertPaymentAllowsPreparation(current.payment_status, payment?.method);
      if (status === OrderStatus.CANCELLED)
        throw new BadRequestException('Use the cancellation endpoint');
      current.status = status;
      current.delivery_status = order.delivery_status;
      current.delivery_step = order.delivery_step;
      await manager.save(current);
      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, { order_id: current.id, status, updated_by: updatedBy }),
      );
      return current;
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
