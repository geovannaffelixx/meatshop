import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/email.service';
import { verifyEmailTemplate } from '../../email/templates/verify-email.template';

const SALT_ROUNDS = 12;

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly emailService: EmailService,

    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RegisterDto): Promise<{ message: string }> {
    await this.ensureEmailIsUnique(dto.email);
    await this.ensureCpfIsUnique(dto.cpf);
    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      cpf: dto.cpf,
      password_hash: await bcrypt.hash(dto.password, SALT_ROUNDS),
      app_profile: dto.app_profile,
      email_verification_token: crypto.randomBytes(32).toString('hex'),
    });

    await this.userRepository.save(user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const verificationUrl = `${frontendUrl}/verify-email?token=${user.email_verification_token}`;

    const template = verifyEmailTemplate(user.name, verificationUrl);

    try {
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

    return { message: 'Account created. Please verify your email.' };
  }

  private async ensureEmailIsUnique(email: string): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: {
        email: email.toLowerCase().trim(),
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
  }

  private async ensureCpfIsUnique(cpf: string): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: {
        cpf,
      },
    });

    if (existingUser) {
      throw new ConflictException('CPF already in use');
    }
  }
}
