import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { UnitPermissionPolicy } from '../../units/services/unit-permission.policy';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { SendNotificationUseCase } from './send-notification.use-case';

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'está aguardando confirmação',
  [OrderStatus.CONFIRMED]: 'foi confirmado',
  [OrderStatus.PREPARING]: 'está sendo preparado',
  [OrderStatus.READY]: 'está pronto',
  [OrderStatus.OUT_FOR_DELIVERY]: 'saiu para entrega',
  [OrderStatus.DELIVERED]: 'foi entregue',
  [OrderStatus.CANCELLED]: 'foi cancelado',
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
    const unit = await this.unitRepository.findOne({ where: { id: order.unit_id } });
    if (!unit) {
      return;
    }

    const memberships = await this.userUnitRepository.find({
      where: { unit_id: unit.id, status: UserUnitStatus.ACTIVE },
    });
    const recipients = memberships.filter(({ local_role }) =>
      this.unitPermissionPolicy.canAccessPanel(local_role),
    );

    await Promise.all(recipients.map(({ user_id }) => this.sendNotificationUseCase.execute({
      user_id,
      unit_id: unit.id,
      title: 'Novo pedido',
      message: `Pedido #${order.id} recebido, no valor de R$ ${Number(order.total_amount).toFixed(2)}`,
      action_url: `/orders/${order.id}`,
      type: NotificationType.ORDER,
    })));
  }

  async notifyCustomerOfStatusChange(order: Order): Promise<void> {
    await this.sendNotificationUseCase.execute({
      user_id: order.client_id,
      unit_id: order.unit_id,
      title: 'Atualização do pedido',
      message: `Seu pedido #${order.id} ${STATUS_MESSAGES[order.status]}`,
      action_url: `/orders/${order.id}`,
      type: NotificationType.ORDER,
    });
  }
}
