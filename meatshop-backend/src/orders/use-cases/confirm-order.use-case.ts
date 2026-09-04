import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../entities/order.entity';
import { OrderAuthorizationService } from '../services/order-authorization.service';
import { OrderStatusService } from '../services/order-status.service';

@Injectable()
export class ConfirmOrderUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  async execute(orderId: number, actor: User | null): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      if (actor === null) {
        return order;
      }
      throw new BadRequestException('Order is not pending confirmation');
    }

    if (actor !== null) {
      await this.orderAuthorizationService.assertCanManageOrder(order, actor);
    }

    return this.orderStatusService.transition(order, OrderStatus.CONFIRMED, actor?.id ?? null);
  }
}
