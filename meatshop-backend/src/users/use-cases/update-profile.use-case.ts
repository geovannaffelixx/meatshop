import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { EmailService } from '../../email/email.service';
import { verifyEmailTemplate } from '../../email/templates/verify-email.template';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class UpdateProfileUseCase {
  private readonly logger = new Logger(UpdateProfileUseCase.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(userId: number, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (dto.name) {
      user.name = dto.name.trim();
    }

    if (dto.email) {
      const normalizedEmail = dto.email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        await this.ensureEmailIsUnique(normalizedEmail);
        user.email = normalizedEmail;
        user.email_verified = false;
        user.email_verification_token = crypto.randomBytes(32).toString('hex');
        await this.sendVerificationEmail(user);
      }
    }

    if (dto.cpf && dto.cpf !== user.cpf) {
      await this.ensureCpfIsUnique(dto.cpf);
      user.cpf = dto.cpf;
    }
    if (dto.phone && dto.phone !== user.phone) {
      await this.ensurePhoneIsUnique(dto.phone);
      user.phone = dto.phone;
    }
    if (dto.app_profile) {
      user.app_profile = dto.app_profile;
    }

    user.profile_complete = Boolean(
      user.name?.trim() && user.cpf?.trim() && user.phone?.trim() && user.app_profile,
    );

    await this.userRepository.save(user);

    return UserResponseDto.fromEntity(user);
  }

  private async ensureCpfIsUnique(cpf: string): Promise<void> {
    const existing = await this.userRepository.findOne({ where: { cpf } });
    if (existing) {
      throw new ConflictException({
        code: 'CPF_ALREADY_EXISTS',
        message: 'CPF already in use.',
      });
    }
  }

  private async ensurePhoneIsUnique(phone: string): Promise<void> {
    const existing = await this.userRepository.findOne({ where: { phone } });
    if (existing) {
      throw new ConflictException({
        code: 'PHONE_ALREADY_EXISTS',
        message: 'Phone already in use.',
      });
    }
  }

  private async ensureEmailIsUnique(email: string): Promise<void> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Já existe uma conta cadastrada com este e-mail.',
      });
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
