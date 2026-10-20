import { Injectable } from '@nestjs/common';
import { Order } from '../../orders/entities/order.entity';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { User } from '../../users/entities/user.entity';
import { DeliveryGateway } from '../delivery.gateway';
import { DeliveryAssignmentService } from '../services/delivery-assignment.service';

@Injectable()
export class AcceptDeliveryUseCase {
  constructor(
    private readonly authorization: OrderAuthorizationService,
    private readonly assignment: DeliveryAssignmentService,
    private readonly notifications: SendOrderStatusNotificationUseCase,
    private readonly gateway: DeliveryGateway,
  ) {}

  async execute(
    orderId: number,
    currentUser: User,
  ): Promise<{ order: Order; pickup_code: string }> {
    const person = await this.authorization.getActiveDeliveryPerson(currentUser);
    const { order, pickupCode, deliveryCode } = await this.assignment.assign(orderId, person.id);
    await Promise.allSettled([
      this.notifications.notifyDeliveryPersonOfPickupCode(order, currentUser.id, pickupCode),
      this.notifications.notifyUnitOfDeliveryAssignment(order, currentUser.name ?? 'Entregador'),
      ...(deliveryCode
        ? [this.notifications.notifyCustomerOfDeliveryCode(order, deliveryCode)]
        : []),
    ]);
    this.gateway.emitDeliveryChanged(order);
    return { order, pickup_code: pickupCode };
  }
}
