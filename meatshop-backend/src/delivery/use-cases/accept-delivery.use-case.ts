import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { DeliveryStep } from '../../orders/enums/delivery-step.enum';
import { DeliveryType } from '../../orders/enums/delivery-type.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { DeliveryCodeService } from '../../orders/services/delivery-code.service';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { User } from '../../users/entities/user.entity';
import { DeliveryGateway } from '../delivery.gateway';

@Injectable()
export class AcceptDeliveryUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly deliveryCodeService: DeliveryCodeService,
    private readonly notifications: SendOrderStatusNotificationUseCase,
    private readonly deliveryGateway: DeliveryGateway,
  ) {}

  async execute(orderId: number, currentUser: User): Promise<Order> {
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
    this.assertAcceptable(order);
    await this.orderAuthorizationService.assertDeliveryPersonCanServeUnit(
      deliveryPerson,
      order.unit_id,
    );

    const pickupCode = this.deliveryCodeService.issue(order, 'PICKUP');
    const deliveryCode = order.delivery_code_hash
      ? null
      : this.deliveryCodeService.issue(order, 'DELIVERY');
    const result = await this.orderRepository.update(
      { id: orderId, delivery_person_id: IsNull() },
      {
        delivery_person_id: deliveryPerson.id,
        delivery_status: DeliveryStatus.PICKUP,
        delivery_step: DeliveryStep.PICKUP,
        pickup_code_hash: order.pickup_code_hash,
        pickup_code_expires_at: order.pickup_code_expires_at,
        pickup_code_attempts: 0,
        pickup_code_locked_until: null,
        pickup_verified_at: null,
        ...(deliveryCode
          ? {
              delivery_code_hash: order.delivery_code_hash,
              delivery_code_expires_at: order.delivery_code_expires_at,
              delivery_code_attempts: 0,
              delivery_code_locked_until: null,
              delivery_verified_at: null,
            }
          : {}),
      },
    );
    if (result.affected === 0) {
      throw new BadRequestException('Order already has a delivery person assigned');
    }

    order.delivery_person_id = deliveryPerson.id;
    order.delivery_status = DeliveryStatus.PICKUP;
    order.delivery_step = DeliveryStep.PICKUP;

    await this.notifications.notifyDeliveryPersonOfPickupCode(order, currentUser.id, pickupCode);
    await this.notifications.notifyUnitOfDeliveryAssignment(
      order,
      currentUser.name ?? 'Entregador',
    );
    if (deliveryCode) {
      await this.notifications.notifyCustomerOfDeliveryCode(order, deliveryCode);
    }
    this.deliveryGateway.emitDeliveryChanged(order);
    return order;
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
