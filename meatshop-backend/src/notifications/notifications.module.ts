import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from '../units/entities/unit.entity';
import { Notification } from './entities/notification.entity';
import { UserDeviceToken } from './entities/user-device-token.entity';
import { NotificationsController } from './notifications.controller';
import { FcmService } from './providers/fcm.service';
import { ListNotificationsUseCase } from './use-cases/list-notifications.use-case';
import { MarkAllAsReadUseCase } from './use-cases/mark-all-as-read.use-case';
import { MarkAsReadUseCase } from './use-cases/mark-as-read.use-case';
import { RegisterDeviceTokenUseCase } from './use-cases/register-device-token.use-case';
import { SendNotificationUseCase } from './use-cases/send-notification.use-case';
import { SendOrderStatusNotificationUseCase } from './use-cases/send-order-status-notification.use-case';
import { UnregisterDeviceTokenUseCase } from './use-cases/unregister-device-token.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, UserDeviceToken, Unit])],
  controllers: [NotificationsController],
  providers: [
    FcmService,
    SendNotificationUseCase,
    SendOrderStatusNotificationUseCase,
    ListNotificationsUseCase,
    MarkAsReadUseCase,
    MarkAllAsReadUseCase,
    RegisterDeviceTokenUseCase,
    UnregisterDeviceTokenUseCase,
  ],
  exports: [TypeOrmModule, SendNotificationUseCase, SendOrderStatusNotificationUseCase],
})
export class NotificationsModule {}
