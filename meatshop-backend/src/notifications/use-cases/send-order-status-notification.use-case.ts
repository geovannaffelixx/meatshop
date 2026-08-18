import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Unit } from '../../units/entities/unit.entity';
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
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  async notifyUnitOfNewOrder(order: Order): Promise<void> {
    const unit = await this.unitRepository.findOne({ where: { id: order.unit_id } });
    if (!unit) {
      return;
    }

    await this.sendNotificationUseCase.execute({
      user_id: unit.admin_id,
      message: `Novo pedido #${order.id} recebido, no valor de R$ ${Number(order.total_amount).toFixed(2)}`,
      type: NotificationType.ORDER,
    });
  }

  async notifyCustomerOfStatusChange(order: Order): Promise<void> {
    await this.sendNotificationUseCase.execute({
      user_id: order.client_id,
      message: `Seu pedido #${order.id} ${STATUS_MESSAGES[order.status]}`,
      type: NotificationType.ORDER,
    });
  }
}
