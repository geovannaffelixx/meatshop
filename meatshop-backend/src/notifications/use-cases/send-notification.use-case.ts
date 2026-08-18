import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { Notification } from '../entities/notification.entity';
import { UserDeviceToken } from '../entities/user-device-token.entity';
import { FcmService, FcmTokenInvalidError } from '../providers/fcm.service';

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserDeviceToken)
    private readonly deviceTokenRepository: Repository<UserDeviceToken>,
    private readonly fcmService: FcmService,
  ) {}

  async execute(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.notificationRepository.save(
      this.notificationRepository.create(dto),
    );

    await this.pushToDevices(dto.user_id, dto.message);

    return notification;
  }

  private async pushToDevices(userId: number, message: string): Promise<void> {
    const tokens = await this.deviceTokenRepository.find({ where: { user_id: userId } });

    await Promise.all(
      tokens.map((token) =>
        this.fcmService
          .send(token.fcm_token, { title: 'MeatShop', body: message })
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
}
