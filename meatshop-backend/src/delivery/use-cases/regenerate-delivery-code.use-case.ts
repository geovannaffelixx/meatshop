import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryCodeService } from '../../orders/services/delivery-code.service';
import type { DeliveryCodePurpose } from '../../orders/services/delivery-code.service';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class RegenerateDeliveryCodeUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly deliveryCodeService: DeliveryCodeService,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly notifications: SendOrderStatusNotificationUseCase,
  ) {}

  async execute(orderId: number, purpose: DeliveryCodePurpose, currentUser: User) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException('Order no longer accepts verification codes');
    }

    if (purpose === 'DELIVERY') {
      this.orderAuthorizationService.assertOwnsOrder(order, currentUser);
    } else {
      if (order.status !== OrderStatus.READY || !order.delivery_person_id) {
        throw new BadRequestException(
          'Pickup code is only available for an assigned order ready for pickup',
        );
      }
      const person = await this.orderAuthorizationService.getActiveDeliveryPerson(currentUser);
      this.orderAuthorizationService.assertIsAssignedDeliveryPerson(order, person);
    }

    const code = this.deliveryCodeService.issue(order, purpose);
    await this.orderRepository.save(order);
    if (purpose === 'DELIVERY') {
      await this.notifications.notifyCustomerOfDeliveryCode(order, code);
      return { code, expiresAt: order.delivery_code_expires_at };
    }
    await this.notifications.notifyDeliveryPersonOfPickupCode(order, currentUser.id, code);
    return { code, expiresAt: order.pickup_code_expires_at };
  }
}
