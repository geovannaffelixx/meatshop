import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { SendNotificationUseCase } from './send-notification.use-case';

@Injectable()
export class SendPromotionNotificationUseCase {
  private readonly logger = new Logger(SendPromotionNotificationUseCase.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly sendNotification: SendNotificationUseCase,
  ) {}

  async execute(promotion: Promotion): Promise<number> {
    const recipients = await this.users
      .createQueryBuilder('user')
      .innerJoin(
        Order,
        'purchase',
        'purchase.client_id = user.id AND purchase.unit_id = :unitId AND purchase.status = :delivered',
        { unitId: promotion.unit_id, delivered: OrderStatus.DELIVERED },
      )
      .innerJoin(
        NotificationPreference,
        'preference',
        'preference.user_id = user.id AND preference.promotions_enabled = true',
      )
      .where('user.is_active = true')
      .distinct(true)
      .getMany();

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        this.sendNotification.execute({
          user_id: recipient.id,
          unit_id: promotion.unit_id,
          title: promotion.title.slice(0, 120),
          message: promotion.description?.trim() || 'Uma nova oferta está disponível para você.',
          type: NotificationType.PROMOTION,
        }),
      ),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Failed to notify user ${recipients[index].id} about promotion ${promotion.id}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    });
    return results.filter((result) => result.status === 'fulfilled').length;
  }
}
