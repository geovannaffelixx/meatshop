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
    order.status = status;
    await this.orderRepository.save(order);

    await this.orderStatusHistoryRepository.save(
      this.orderStatusHistoryRepository.create({
        order_id: order.id,
        status,
        updated_by: updatedBy,
      }),
    );

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
