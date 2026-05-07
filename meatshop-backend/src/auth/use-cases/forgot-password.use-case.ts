import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

const RESET_TOKEN_EXPIRY_HOURS = 2;

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return the same message to prevent email enumeration
    if (!user) {
      return this.genericResponse();
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

    user.password_reset_token = token;
    user.password_reset_expires_at = expiresAt;
    await this.userRepository.save(user);

    // TODO: dispatch PasswordResetRequestedEvent via EventEmitter

    return this.genericResponse();
  }

  private genericResponse() {
    return {
      message: 'If this email is registered, you will receive a reset link.',
    };
  }
}