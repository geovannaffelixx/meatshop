import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AuditTrailService } from '../../audit/audit-trail.service';
import { User } from '../../users/entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

export const REFRESH_TOKEN_TTL_DAYS = 7;
const REFRESH_TOKEN_BYTES = 64;

export interface IAuthTokens {
  access_token: string;
  refresh_token: string;
}

export type SessionRevocationReason = 'PASSWORD_CHANGED' | 'PASSWORD_RESET' | 'REFRESH_TOKEN_REUSE';

export function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class AuthSessionService {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly auditTrail: AuditTrailService,
  ) {}

  async issue(user: User): Promise<IAuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
        global_role: user.global_role,
        app_profile: user.app_profile,
      }),
      this.persistRefreshToken(user.id),
    ]);
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async rotate(rawToken: string): Promise<IAuthTokens> {
    const stored = await this.refreshTokens.findOne({
      where: { token_hash: hashRefreshToken(rawToken) },
      relations: ['user'],
    });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    if (stored.revoked || !(await this.claim(stored))) {
      await this.revokeAll(stored.user_id, 'REFRESH_TOKEN_REUSE');
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REUSED',
        message: 'Sessão encerrada por segurança. Entre novamente.',
      });
    }
    if (stored.expires_at < new Date()) throw new UnauthorizedException('Refresh token expired');
    if (!stored.user.is_active) throw new UnauthorizedException('Account disabled');
    return this.issue(stored.user);
  }

  async revoke(rawToken: string): Promise<boolean> {
    const result = await this.refreshTokens.update(
      { token_hash: hashRefreshToken(rawToken), revoked: false },
      { revoked: true },
    );
    return Boolean(result.affected);
  }

  async revokeAll(userId: number, reason: SessionRevocationReason): Promise<number> {
    const result = await this.refreshTokens.update(
      { user_id: userId, revoked: false },
      { revoked: true },
    );
    const revoked = result.affected ?? 0;
    await this.auditTrail.safeRecord({
      action: 'SESSIONS_REVOKED',
      entity: 'refresh_tokens',
      entityId: String(userId),
      userId,
      actorType: reason === 'REFRESH_TOKEN_REUSE' ? 'SYSTEM' : 'USER',
      description: `All refresh sessions revoked: ${reason}`,
      newData: { reason, revoked_sessions: revoked },
    });
    return revoked;
  }

  private async claim(token: RefreshTokenEntity): Promise<boolean> {
    const result = await this.refreshTokens.update(
      { id: token.id, revoked: false },
      { revoked: true },
    );
    return Boolean(result.affected);
  }

  private async persistRefreshToken(userId: number): Promise<string> {
    const raw = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
    await this.refreshTokens.save(
      this.refreshTokens.create({
        token_hash: hashRefreshToken(raw),
        user_id: userId,
        expires_at: expiresAt,
      }),
    );
    return raw;
  }
}
