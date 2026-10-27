import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
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
    @InjectRepository(Promotion)
    private readonly promotions: Repository<Promotion>,
  ) {}

  @Cron('0 * * * * *', { waitForCompletion: true })
  async sendDue(): Promise<void> {
    const now = new Date();
    const due = await this.promotions.find({
      where: {
        active: true,
        notification_sent_at: IsNull(),
        starts_at: LessThanOrEqual(now),
        ends_at: MoreThan(now),
      },
      order: { starts_at: 'ASC', id: 'ASC' },
      take: 50,
    });
    for (const promotion of due) {
      try {
        await this.execute(promotion);
      } catch (error) {
        this.logger.warn(
          `Failed to process promotion ${promotion.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  async execute(promotion: Promotion): Promise<number> {
    const now = new Date();
    if (!promotion.active || promotion.starts_at > now || promotion.ends_at <= now) return 0;
    const recipients = await this.users
      .createQueryBuilder('user')
      .innerJoin(
        Order,
        'purchase',
        'purchase.client_id = user.id AND purchase.unit_id = :unitId AND purchase.status = :delivered',
        { unitId: promotion.unit_id, delivered: OrderStatus.DELIVERED },
      )
      .leftJoin(NotificationPreference, 'preference', 'preference.user_id = user.id')
      .where('user.is_active = true')
      .andWhere('COALESCE(preference.promotions_enabled, true) = true')
      .distinct(true)
      .getMany();

    // Atomic claim prevents the cron and simultaneous activations from duplicating a campaign.
    const claimed = await this.promotions
      .createQueryBuilder()
      .update(Promotion)
      .set({ notification_sent_at: now })
      .where('id = :id', { id: promotion.id })
      .andWhere('active = true AND notification_sent_at IS NULL')
      .andWhere('starts_at <= :now AND ends_at > :now', { now })
      .execute();
    if (claimed.affected !== 1) return 0;

    let sent = 0;
    for (let offset = 0; offset < recipients.length; offset += 20) {
      const batch = recipients.slice(offset, offset + 20);
      const results = await Promise.allSettled(
        batch.map((recipient) =>
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
            `Failed to notify user ${batch[index].id} about promotion ${promotion.id}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
          );
        }
      });
      sent += results.filter((result) => result.status === 'fulfilled').length;
    }
    return sent;
  }
}
