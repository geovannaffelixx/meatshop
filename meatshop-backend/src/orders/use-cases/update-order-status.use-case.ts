import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto';
import { Order } from '../entities/order.entity';
import { OrderAuthorizationService } from '../services/order-authorization.service';
import { OrderStatusService } from '../services/order-status.service';
import { OrderStatusTransitionValidator } from '../validators/order-status-transition.validator';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly orderStatusService: OrderStatusService,
    private readonly transitionValidator: OrderStatusTransitionValidator,
  ) {}

  async execute(orderId: number, dto: UpdateOrderStatusDto, currentUser: User): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.orderAuthorizationService.assertCanManageOrder(order, currentUser);
    this.transitionValidator.assertValid(order.status, dto.status, order.delivery_type);

    return this.orderStatusService.transition(order, dto.status, currentUser.id);
  }
}
