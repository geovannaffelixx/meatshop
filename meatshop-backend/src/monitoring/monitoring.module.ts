import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MonitoringController } from './monitoring.controller';

@Module({ imports: [NotificationsModule], controllers: [MonitoringController] })
export class MonitoringModule {}
