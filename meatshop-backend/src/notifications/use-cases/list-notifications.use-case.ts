import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ListNotificationsQueryDto } from '../dtos/list-notifications-query.dto';
import { NotificationResponseDto } from '../dtos/notification-response.dto';
import { Notification } from '../entities/notification.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async execute(
    query: ListNotificationsQueryDto,
    currentUser: User,
  ): Promise<NotificationResponseDto[]> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const builder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId: currentUser.id })
      .orderBy('notification.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.read !== undefined) {
      builder.andWhere('notification.read = :read', { read: query.read === 'true' });
    }
    if (query.unit_id !== undefined) {
      builder.andWhere('(notification.unit_id = :unitId OR notification.unit_id IS NULL)', {
        unitId: query.unit_id,
      });
    }

    const notifications = await builder.getMany();

    return NotificationResponseDto.fromEntities(notifications);
  }
}
