import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { OrderStatusService } from '../../orders/services/order-status.service';
import { User } from '../../users/entities/user.entity';
import { DeliveryGateway } from '../delivery.gateway';
import { VerifyDeliveryCodeDto } from '../dtos/verify-delivery-code.dto';
import { DeliveryCodeService } from '../../orders/services/delivery-code.service';

@Injectable()
export class FinishDeliveryUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly orderStatusService: OrderStatusService,
    private readonly deliveryGateway: DeliveryGateway,
    private readonly deliveryCodeService: DeliveryCodeService,
  ) {}

  async execute(orderId: number, dto: VerifyDeliveryCodeDto, currentUser: User): Promise<Order> {
    const deliveryPerson =
      await this.orderAuthorizationService.getActiveDeliveryPerson(currentUser);

    const order = await this.orderRepository
      .createQueryBuilder('order')
      .addSelect('order.delivery_code_hash')
      .where('order.id = :orderId', { orderId })
      .getOne();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.orderAuthorizationService.assertIsAssignedDeliveryPerson(order, deliveryPerson);

    if (order.delivery_status !== DeliveryStatus.ON_THE_WAY) {
      throw new BadRequestException('Order is not currently out for delivery');
    }

    await this.deliveryCodeService.verify(order, 'DELIVERY', dto.code);
    order.delivery_status = DeliveryStatus.DELIVERED;
    order.delivery_step = null;

    const savedOrder = await this.orderStatusService.transition(
      order,
      OrderStatus.DELIVERED,
      currentUser.id,
    );
    this.deliveryGateway.emitDeliveryChanged(savedOrder);
    return savedOrder;
  }
}
