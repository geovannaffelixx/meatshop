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
    await this.deviceTokenRepository.upsert(
      {
        user_id: currentUser.id,
        fcm_token: dto.fcm_token,
        ...(dto.platform ? { platform: dto.platform } : {}),
        app_version: dto.app_version ?? null,
        last_seen_at: new Date(),
      },
      ['fcm_token'],
    );
  }
}
