import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserDeviceToken } from '../entities/user-device-token.entity';

@Injectable()
export class UnregisterDeviceTokenUseCase {
  constructor(
    @InjectRepository(UserDeviceToken)
    private readonly deviceTokenRepository: Repository<UserDeviceToken>,
  ) {}

  async execute(fcmToken: string, currentUser: User): Promise<void> {
    await this.deviceTokenRepository.delete({
      fcm_token: fcmToken,
      user_id: currentUser.id,
    });
  }
}
