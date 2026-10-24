import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { CredentialAttemptsService } from '../services/credential-attempts.service';
import { User } from '../../users/entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

const REFRESH_TOKEN_DAYS = 7;

interface IAuthTokens {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async validateCredentials(email: string, password: string): Promise<User | null> {
    return new CredentialAttemptsService(this.dataSource).authenticate(email, async (manager) => {
      const user = await manager.findOne(User, { where: { email: email.trim().toLowerCase() } });
      if (!user?.is_active || !user.password_hash) return null;
      return (await bcrypt.compare(password, user.password_hash)) ? user : null;
    });
  }

  async execute(user: User): Promise<IAuthTokens> {
    if (!user.is_active) {
      throw new UnauthorizedException('Account disabled');
    }
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateAndPersistRefreshToken(user),
    ]);

    return { access_token: accessToken, refresh_token: refreshToken };
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
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    const entity = this.refreshTokenRepository.create({
      token_hash: hash,
      user_id: user.id,
      expires_at: expiresAt,
    });

    await this.refreshTokenRepository.save(entity);
    return raw;
  }
}
