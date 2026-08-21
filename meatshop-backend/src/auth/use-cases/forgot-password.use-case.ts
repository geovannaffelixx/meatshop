import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { EmailService } from '../../email/email.service';
import { resetPasswordTemplate } from '../../email/templates/reset-password.template';
import { User } from '../../users/entities/user.entity';

const RESET_TOKEN_EXPIRY_HOURS = 2;

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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

    await this.sendResetEmail(user, token);

    return this.genericResponse();
  }

  private async sendResetEmail(user: User, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const template = resetPasswordTemplate(user.name, resetUrl);

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to user ${user.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private genericResponse() {
    return {
      message: 'If this email is registered, you will receive a reset link.',
    };
  }
}
