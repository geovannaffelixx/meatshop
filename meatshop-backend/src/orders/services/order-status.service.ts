import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../entities/order.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';

@Injectable()
export class OrderStatusService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderStatusHistory)
    private readonly orderStatusHistoryRepository: Repository<OrderStatusHistory>,
  ) {}

  async transition(
    order: Order,
    status: OrderStatus,
    updatedBy: number | null,
  ): Promise<Order> {
    order.status = status;
    await this.orderRepository.save(order);

    await this.orderStatusHistoryRepository.save(
      this.orderStatusHistoryRepository.create({
        order_id: order.id,
        status,
        updated_by: updatedBy,
      }),
    );

    return order;
  }
}
