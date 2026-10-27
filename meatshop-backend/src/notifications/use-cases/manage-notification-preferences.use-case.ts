import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UpdateNotificationPreferencesDto } from '../dtos/update-notification-preferences.dto';
import { NotificationPreference } from '../entities/notification-preference.entity';

@Injectable()
export class ManageNotificationPreferencesUseCase {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferences: Repository<NotificationPreference>,
  ) {}

  async get(currentUser: User): Promise<NotificationPreference> {
    const existing = await this.preferences.findOne({
      where: { user_id: currentUser.id },
    });
    if (existing) return existing;
    await this.preferences.upsert(
      { user_id: currentUser.id },
      { conflictPaths: ['user_id'], skipUpdateIfNoValuesChanged: true },
    );
    return this.preferences.findOneByOrFail({ user_id: currentUser.id });
  }

  async update(
    dto: UpdateNotificationPreferencesDto,
    currentUser: User,
  ): Promise<NotificationPreference> {
    const preferences = await this.get(currentUser);
    Object.assign(preferences, dto);
    return this.preferences.save(preferences);
  }
}
