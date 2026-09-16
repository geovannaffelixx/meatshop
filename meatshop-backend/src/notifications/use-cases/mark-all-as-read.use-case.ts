import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class MarkAllAsReadUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async execute(currentUser: User, unitId?: number): Promise<void> {
    if (unitId === undefined) {
      await this.notificationRepository.update(
        { user_id: currentUser.id, read: false },
        { read: true },
      );
      return;
    }

    await Promise.all([
      this.notificationRepository.update(
        { user_id: currentUser.id, unit_id: unitId, read: false },
        { read: true },
      ),
      this.notificationRepository.update(
        { user_id: currentUser.id, unit_id: IsNull(), read: false },
        { read: true },
      ),
    ]);
  }
}
