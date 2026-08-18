import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class MarkAllAsReadUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async execute(currentUser: User): Promise<void> {
    await this.notificationRepository.update(
      { user_id: currentUser.id, read: false },
      { read: true },
    );
  }
}
