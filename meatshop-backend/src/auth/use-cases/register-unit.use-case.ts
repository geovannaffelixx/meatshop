import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { AppProfile } from '../../common/enums/app-profile.enum';
import { LocalRole } from '../../common/enums/local-role.enum';
import { EmailService } from '../../email/email.service';
import { verifyEmailTemplate } from '../../email/templates/verify-email.template';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { User } from '../../users/entities/user.entity';
import { RegisterUnitDto } from '../dto/register-unit.dto';
import { LoginUseCase } from './login.use-case';

const SALT_ROUNDS = 12;

@Injectable()
export class RegisterUnitUseCase {
  private readonly logger = new Logger(RegisterUnitUseCase.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  async execute(dto: RegisterUnitDto) {
    await this.ensureEmailIsUnique(dto.owner.email);
    await this.ensureCpfIsUnique(dto.owner.cpf);
    await this.ensureCnpjIsUnique(dto.unit.cnpj);

    const { user, unit } = await this.dataSource.transaction(async (manager) => {
      const user = await manager.save(
        User,
        manager.create(User, {
          name: dto.owner.name,
          email: dto.owner.email.toLowerCase().trim(),
          cpf: dto.owner.cpf,
          password_hash: await bcrypt.hash(dto.owner.password, SALT_ROUNDS),
          app_profile: AppProfile.CLIENT,
          email_verification_token: crypto.randomBytes(32).toString('hex'),
        }),
      );

      const unit = await manager.save(
        Unit,
        manager.create(Unit, {
          ...dto.unit,
          admin_id: user.id,
        }),
      );

      await manager.save(
        UserUnit,
        manager.create(UserUnit, {
          user_id: user.id,
          unit_id: unit.id,
          local_role: LocalRole.OWNER,
        }),
      );

      return { user, unit };
    });

    this.logger.log(`Unit ${unit.id} registered with new owner ${user.id}`);

    await this.sendVerificationEmail(user);

    const tokens = await this.loginUseCase.execute(user);

    return { ...tokens, unit };
  }

  private async ensureEmailIsUnique(email: string): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Já existe uma conta cadastrada com este e-mail.',
      });
    }
  }

  private async ensureCpfIsUnique(cpf: string): Promise<void> {
    const existing = await this.userRepository.findOne({ where: { cpf } });
    if (existing) {
      throw new ConflictException({
        code: 'CPF_ALREADY_EXISTS',
        message: 'Já existe uma conta cadastrada com este CPF.',
      });
    }
  }

  private async ensureCnpjIsUnique(cnpj: string): Promise<void> {
    const existing = await this.unitRepository.findOne({ where: { cnpj } });
    if (existing) {
      throw new ConflictException({
        code: 'CNPJ_ALREADY_EXISTS',
        message: 'Já existe um açougue cadastrado com este CNPJ.',
      });
    }
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify-email?token=${user.email_verification_token}`;
      const template = verifyEmailTemplate(user.name, verificationUrl);

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
