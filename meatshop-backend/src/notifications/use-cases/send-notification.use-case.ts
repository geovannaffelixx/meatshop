import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { Notification } from '../entities/notification.entity';
import { UserDeviceToken } from '../entities/user-device-token.entity';
import { FcmService, FcmTokenInvalidError } from '../providers/fcm.service';
import { NotificationsGateway } from '../notifications.gateway';

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserDeviceToken)
    private readonly deviceTokenRepository: Repository<UserDeviceToken>,
    private readonly fcmService: FcmService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async execute(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.notificationRepository.save(
      this.notificationRepository.create({ title: 'MeatShop', ...dto }),
    );

    this.notificationsGateway.emitToUser(notification);
    await this.pushToDevices(notification);

    return notification;
  }

  private async pushToDevices(notification: Notification): Promise<void> {
    const inactiveBefore = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await this.deviceTokenRepository.delete({
      user_id: notification.user_id,
      last_seen_at: LessThan(inactiveBefore),
    });
    const tokens = await this.deviceTokenRepository.find({
      where: {
        user_id: notification.user_id,
        last_seen_at: MoreThanOrEqual(inactiveBefore),
      },
    });
    const data: Record<string, string> = {
      notification_id: String(notification.id),
      type: notification.type,
      ...(notification.action_url ? { action_url: notification.action_url } : {}),
    };
    const pushBody = this.safePushBody(notification.type);

    await Promise.all(
      tokens.map((token) =>
        this.fcmService
          .send(token.fcm_token, { title: notification.title, body: pushBody }, data)
          .catch(async (error) => {
            if (error instanceof FcmTokenInvalidError) {
              await this.deviceTokenRepository.remove(token);
              return;
            }
            this.logger.warn(`Failed to push notification to device ${token.id}: ${error.message}`);
          }),
      ),
    );
  }

  private safePushBody(type: Notification['type']): string {
    switch (type) {
      case 'ORDER':
        return 'Consulte a atualização do seu pedido no aplicativo.';
      case 'DELIVERY':
        return 'Consulte a atualização da entrega no aplicativo.';
      case 'PROMOTION':
        return 'Uma nova oferta está disponível no MeatShop.';
      default:
        return 'Você recebeu uma nova atualização no MeatShop.';
    }
  }
}
