import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { EmailService } from '../../email/email.service';
import { verifyEmailTemplate } from '../../email/templates/verify-email.template';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { User } from '../entities/user.entity';
import { UserIdentityService } from '../services/user-identity.service';

@Injectable()
export class UpdateProfileUseCase {
  private readonly logger = new Logger(UpdateProfileUseCase.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly identity: UserIdentityService,
  ) {}

  async execute(userId: number, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.name) {
      user.name = dto.name.trim();
    }
    await this.applyEmail(user, dto.email);
    await this.applyIdentity(user, dto);
    if (dto.app_profile) {
      user.app_profile = dto.app_profile;
    }

    user.profile_complete =
      user.profile_complete ||
      Boolean(user.name?.trim() && user.cpf?.trim() && user.phone?.trim() && user.app_profile);

    await this.userRepository.save(user);

    return UserResponseDto.fromEntity(user);
  }

  private async applyEmail(user: User, email?: string): Promise<void> {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail || normalizedEmail === user.email) return;
    if (user.firebase_uid) {
      throw new BadRequestException('Confirme a alteração de e-mail pelo provedor de identidade.');
    }
    await this.identity.assertEmailAvailable(normalizedEmail);
    user.email = normalizedEmail;
    user.email_verified = false;
    user.email_verification_token = crypto.randomBytes(32).toString('hex');
    await this.sendVerificationEmail(user);
  }

  private async applyIdentity(user: User, dto: UpdateProfileDto): Promise<void> {
    if (dto.cpf && dto.cpf !== user.cpf) {
      await this.identity.assertCpfAvailable(dto.cpf, user.id);
      user.cpf = dto.cpf;
    }
    if (dto.phone && dto.phone !== user.phone) {
      await this.identity.assertPhoneAvailable(dto.phone, user.id);
      user.phone = dto.phone;
    }
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify-email?token=${user.email_verification_token}`;
      const template = verifyEmailTemplate(user.name ?? '', verificationUrl);

      await this.emailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to user ${user.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
