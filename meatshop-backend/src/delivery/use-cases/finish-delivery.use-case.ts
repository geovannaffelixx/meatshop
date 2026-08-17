import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { OrderStatusService } from '../../orders/services/order-status.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class FinishDeliveryUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  async execute(orderId: number, currentUser: User): Promise<Order> {
    const deliveryPerson =
      await this.orderAuthorizationService.getActiveDeliveryPerson(currentUser);

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.orderAuthorizationService.assertIsAssignedDeliveryPerson(order, deliveryPerson);

    if (order.delivery_status !== DeliveryStatus.ON_THE_WAY) {
      throw new BadRequestException('Order is not currently out for delivery');
    }

    order.delivery_status = DeliveryStatus.DELIVERED;
    order.delivery_step = null;

    return this.orderStatusService.transition(order, OrderStatus.DELIVERED, currentUser.id);
  }
}
