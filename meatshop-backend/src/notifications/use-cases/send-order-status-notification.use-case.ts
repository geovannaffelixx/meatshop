import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { UnitPermissionPolicy } from '../../units/services/unit-permission.policy';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { SendNotificationUseCase } from './send-notification.use-case';

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'is awaiting confirmation',
  [OrderStatus.CONFIRMED]: 'foi confirmado',
  [OrderStatus.PREPARING]: 'is being prepared',
  [OrderStatus.READY]: 'is ready',
  [OrderStatus.OUT_FOR_DELIVERY]: 'is out for delivery',
  [OrderStatus.DELIVERED]: 'was delivered',
  [OrderStatus.CANCELLED]: 'was canceled',
};

@Injectable()
export class SendOrderStatusNotificationUseCase {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly userUnitRepository: Repository<UserUnit>,
    private readonly unitPermissionPolicy: UnitPermissionPolicy,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  async notifyUnitOfNewOrder(order: Order): Promise<void> {
    const unit = await this.unitRepository.findOne({
      where: { id: order.unit_id },
    });
    if (!unit) {
      return;
    }

    const memberships = await this.userUnitRepository.find({
      where: { unit_id: unit.id, status: UserUnitStatus.ACTIVE },
    });
    const recipients = memberships.filter(({ local_role }) =>
      this.unitPermissionPolicy.canAccessPanel(local_role),
    );

    await Promise.all(
      recipients.map(({ user_id }) =>
        this.sendNotificationUseCase.execute({
          user_id,
          unit_id: unit.id,
          title: 'New order',
          message: `Order #${order.id} received, totaling BRL ${Number(order.total_amount).toFixed(2)}`,
          action_url: `/orders/${order.id}`,
          type: NotificationType.ORDER,
        }),
      ),
    );
  }

  async notifyCustomerOfStatusChange(order: Order): Promise<void> {
    await this.sendNotificationUseCase.execute({
      user_id: order.client_id,
      unit_id: order.unit_id,
      title: 'Order update',
      message: `Your order #${order.id} ${STATUS_MESSAGES[order.status]}`,
      action_url: `/orders/${order.id}`,
      type: NotificationType.ORDER,
    });
  }

  async notifyCustomerOfDeliveryCode(order: Order, _code: string): Promise<void> {
    await this.sendNotificationUseCase.execute({
      user_id: order.client_id,
      unit_id: order.unit_id,
      title: 'Delivery confirmation code',
      message: `The confirmation code for order #${order.id} is available only on the protected order screen.`,
      action_url: `/orders/${order.id}`,
      type: NotificationType.DELIVERY,
    });
  }

  async notifyDeliveryPersonOfPickupCode(
    order: Order,
    deliveryUserId: number,
    _code: string,
  ): Promise<void> {
    await this.sendNotificationUseCase.execute({
      user_id: deliveryUserId,
      unit_id: order.unit_id,
      title: 'Order pickup code',
      message: `The pickup code for order #${order.id} is available only on the protected delivery screen.`,
      action_url: `/orders/${order.id}`,
      type: NotificationType.DELIVERY,
    });
  }

  async notifyUnitOfDeliveryAssignment(order: Order, deliveryPersonName: string): Promise<void> {
    const memberships = await this.userUnitRepository.find({
      where: { unit_id: order.unit_id, status: UserUnitStatus.ACTIVE },
    });
    const recipients = memberships.filter(({ local_role }) =>
      this.unitPermissionPolicy.has(local_role, UnitPermission.VIEW_DELIVERIES),
    );

    await Promise.all(
      recipients.map(({ user_id }) =>
        this.sendNotificationUseCase.execute({
          user_id,
          unit_id: order.unit_id,
          title: 'Delivery person assigned',
          message: `${deliveryPersonName} will pick up order #${order.id}. Validate the code before releasing the order.`,
          action_url: '/deliveries',
          type: NotificationType.DELIVERY,
        }),
      ),
    );
  }
}
