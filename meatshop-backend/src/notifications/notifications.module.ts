import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from '../units/entities/unit.entity';
import { UserUnit } from '../units/entities/user-unit.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { UnitsModule } from '../units/units.module';
import { NotificationsGateway } from './notifications.gateway';
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
import { NotificationPreference } from './entities/notification-preference.entity';
import { ManageNotificationPreferencesUseCase } from './use-cases/manage-notification-preferences.use-case';
import { SendPromotionNotificationUseCase } from './use-cases/send-promotion-notification.use-case';

@Module({
  imports: [
    AuthModule,
    UnitsModule,
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      UserDeviceToken,
      Unit,
      UserUnit,
      User,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    FcmService,
    NotificationsGateway,
    SendNotificationUseCase,
    SendOrderStatusNotificationUseCase,
    ListNotificationsUseCase,
    MarkAsReadUseCase,
    MarkAllAsReadUseCase,
    RegisterDeviceTokenUseCase,
    UnregisterDeviceTokenUseCase,
    ManageNotificationPreferencesUseCase,
    SendPromotionNotificationUseCase,
  ],
  exports: [
    TypeOrmModule,
    SendNotificationUseCase,
    SendOrderStatusNotificationUseCase,
    SendPromotionNotificationUseCase,
  ],
})
export class NotificationsModule {}
