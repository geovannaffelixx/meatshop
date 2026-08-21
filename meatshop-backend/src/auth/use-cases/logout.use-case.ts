import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

@Injectable()
export class LogoutUseCase {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  async execute(rawRefreshToken: string): Promise<{ message: string }> {
    const hash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const token = await this.refreshTokenRepository.findOne({
      where: { token_hash: hash, revoked: false },
    });

    if (!token) {
      throw new UnauthorizedException('Refresh token not found or already revoked');
    }

    token.revoked = true;
    await this.refreshTokenRepository.save(token);

    return { message: 'Logged out successfully' };
  }
}