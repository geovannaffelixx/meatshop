import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async execute(rawToken: string): Promise<AuthTokens> {
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const stored = await this.refreshTokenRepository.findOne({
      where: { token_hash: hash, revoked: false },
      relations: ['user'],
    });

    this.assertTokenIsValid(stored);

    // Token rotation: revoke old, issue new
    stored!.revoked = true;
    await this.refreshTokenRepository.save(stored!);

    const user = stored!.user;
    const [accessToken, newRefreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateAndPersistRefreshToken(user),
    ]);

    return { access_token: accessToken, refresh_token: newRefreshToken };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private assertTokenIsValid(token: RefreshTokenEntity | null): void {
    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (token.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }
  }

  private generateAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      global_role: user.global_role,
      app_profile: user.app_profile,
    });
  }

  private async generateAndPersistRefreshToken(user: User): Promise<string> {
    const raw = crypto.randomBytes(64).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const entity = this.refreshTokenRepository.create({
      token_hash: hash,
      user_id: user.id,
      expires_at: expiresAt,
    });

    await this.refreshTokenRepository.save(entity);
    return raw;
  }
}