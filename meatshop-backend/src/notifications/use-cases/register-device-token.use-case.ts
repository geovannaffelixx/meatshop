import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RegisterDeviceTokenDto } from '../dtos/register-device-token.dto';
import { UserDeviceToken } from '../entities/user-device-token.entity';

@Injectable()
export class RegisterDeviceTokenUseCase {
  constructor(
    @InjectRepository(UserDeviceToken)
    private readonly deviceTokenRepository: Repository<UserDeviceToken>,
  ) {}

  async execute(dto: RegisterDeviceTokenDto, currentUser: User): Promise<void> {
    const existing = await this.deviceTokenRepository.findOne({
      where: { fcm_token: dto.fcm_token },
    });

    if (existing) {
      existing.user_id = currentUser.id;
      existing.platform = dto.platform ?? existing.platform;
      existing.app_version = dto.app_version ?? null;
      existing.last_seen_at = new Date();
      await this.deviceTokenRepository.save(existing);
      return;
    }

    await this.deviceTokenRepository.save(
      this.deviceTokenRepository.create({
        user_id: currentUser.id,
        fcm_token: dto.fcm_token,
        platform: dto.platform ?? 'WEB',
        app_version: dto.app_version ?? null,
      }),
    );
  }
}
