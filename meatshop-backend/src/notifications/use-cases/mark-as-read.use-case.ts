import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationResponseDto } from '../dtos/notification-response.dto';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class MarkAsReadUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async execute(id: number, currentUser: User): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id, user_id: currentUser.id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    const saved = await this.notificationRepository.save(notification);
    return NotificationResponseDto.fromEntity(saved);
  }
}
