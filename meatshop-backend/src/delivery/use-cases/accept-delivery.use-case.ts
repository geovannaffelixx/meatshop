import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { DeliveryStep } from '../../orders/enums/delivery-step.enum';
import { DeliveryType } from '../../orders/enums/delivery-type.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { OrderStatusService } from '../../orders/services/order-status.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AcceptDeliveryUseCase {
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
    this.assertAcceptable(order);

    const result = await this.orderRepository.update(
      { id: orderId, delivery_person_id: IsNull() },
      {
        delivery_person_id: deliveryPerson.id,
        delivery_status: DeliveryStatus.PICKUP,
        delivery_step: DeliveryStep.PICKUP,
      },
    );
    if (result.affected === 0) {
      throw new BadRequestException('Order already has a delivery person assigned');
    }

    order.delivery_person_id = deliveryPerson.id;
    order.delivery_status = DeliveryStatus.PICKUP;
    order.delivery_step = DeliveryStep.PICKUP;

    return this.orderStatusService.transition(
      order,
      OrderStatus.OUT_FOR_DELIVERY,
      currentUser.id,
    );
  }

  private assertAcceptable(order: Order): void {
    if (order.delivery_type !== DeliveryType.DELIVERY) {
      throw new BadRequestException('This order does not require a delivery person');
    }
    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('Order is not ready for pickup');
    }
  }
}
