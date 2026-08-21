import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { DeliveryStep } from '../../orders/enums/delivery-step.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UpdateDeliveryStatusDto } from '../dtos/update-delivery-status.dto';

@Injectable()
export class UpdateDeliveryStatusUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
  ) {}

  async execute(
    orderId: number,
    dto: UpdateDeliveryStatusDto,
    currentUser: User,
  ): Promise<Order> {
    const deliveryPerson =
      await this.orderAuthorizationService.getActiveDeliveryPerson(currentUser);

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.orderAuthorizationService.assertIsAssignedDeliveryPerson(order, deliveryPerson);

    if (order.delivery_status !== DeliveryStatus.PICKUP) {
      throw new BadRequestException('Order is not waiting for pickup');
    }

    order.delivery_status = dto.delivery_status;
    order.delivery_step = DeliveryStep.DELIVERING;
    return this.orderRepository.save(order);
  }
}
