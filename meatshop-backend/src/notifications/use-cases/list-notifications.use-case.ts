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

    const where: Record<string, unknown> = { user_id: currentUser.id };
    if (query.read !== undefined) {
      where.read = query.read === 'true';
    }

    const notifications = await this.notificationRepository.find({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NotificationResponseDto.fromEntities(notifications);
  }
}
