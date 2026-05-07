import {
    Injectable,
    UnauthorizedException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const REFRESH_TOKEN_DAYS = 7;

interface AuthTokens {
    access_token: string;
    refresh_token: string;
}

@Injectable()
export class LoginUseCase {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(RefreshTokenEntity)
        private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    /** Used by LocalStrategy to validate credentials only */
    async validateCredentials(email: string, password: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) return null;

        this.assertAccountNotLocked(user);

        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            await this.incrementFailedAttempts(user);
            return null;
        }

        await this.resetFailedAttempts(user);
        return user;
    }

    /** Called after credentials are validated — generates and persists tokens */
    async execute(user: User): Promise<AuthTokens> {
        const [accessToken, refreshToken] = await Promise.all([
            this.generateAccessToken(user),
            this.generateAndPersistRefreshToken(user),
        ]);

        return { access_token: accessToken, refresh_token: refreshToken };
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private assertAccountNotLocked(user: User): void {
        if (user.locked_until && user.locked_until > new Date()) {
            throw new HttpException(
                `Account locked. Try again after ${user.locked_until.toISOString()}`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    private async incrementFailedAttempts(user: User): Promise<void> {
        user.failed_login_attempts += 1;

        if (user.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);
            user.locked_until = lockUntil;
            user.failed_login_attempts = 0;
        }

        await this.userRepository.save(user);
    }

    private async resetFailedAttempts(user: User): Promise<void> {
        if (user.failed_login_attempts > 0 || user.locked_until) {
            user.failed_login_attempts = 0;
            user.locked_until = null;
            await this.userRepository.save(user);
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