import type { EntityManager } from 'typeorm';
import { LegalPolicyService } from '../../legal/services/legal-policy.service';
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
import { UnitAddressService } from '../../units/services/unit-address.service';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { User } from '../../users/entities/user.entity';
import { UserIdentityService } from '../../users/services/user-identity.service';
import { RegisterUnitDto } from '../dto/register-unit.dto';
import { LoginUseCase } from './login.use-case';

const SALT_ROUNDS = 12;

@Injectable()
export class RegisterUnitUseCase {
  private readonly logger = new Logger(RegisterUnitUseCase.name);

  constructor(
    private readonly legal: LegalPolicyService,
    private readonly identity: UserIdentityService,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly loginUseCase: LoginUseCase,
    private readonly geocoding: UnitAddressService,
  ) {}

  async execute(dto: RegisterUnitDto) {
    await this.legal.validate(dto.legal_acceptance, true);
    await this.identity.assertEmailAvailable(dto.owner.email);
    await this.identity.assertCpfAvailable(dto.owner.cpf);
    await this.ensureCnpjIsUnique(dto.unit.cnpj);

    const coordinates = await this.geocoding.coordinatesFor(dto.unit);
    const { user, unit } = await this.dataSource.transaction((manager) =>
      this.persist(manager, dto, coordinates),
    );

    this.logger.log(`Unit ${unit.id} registered with new owner ${user.id}`);

    await this.sendVerificationEmail(user);

    const tokens = await this.loginUseCase.execute(user);

    return { ...tokens, unit };
  }

  private async persist(
    manager: EntityManager,
    dto: RegisterUnitDto,
    coordinates: Awaited<ReturnType<UnitAddressService['coordinatesFor']>>,
  ): Promise<{ user: User; unit: Unit }> {
    const user = await this.createOwner(manager, dto.owner);
    const unit = await manager.save(
      Unit,
      manager.create(Unit, { ...dto.unit, ...coordinates, admin_id: user.id }),
    );
    await manager.save(
      UserUnit,
      manager.create(UserUnit, {
        user_id: user.id,
        unit_id: unit.id,
        local_role: LocalRole.OWNER,
      }),
    );
    await this.legal.record(manager, user.id, dto.legal_acceptance, unit.id);
    return { user, unit };
  }

  private async createOwner(
    manager: EntityManager,
    owner: RegisterUnitDto['owner'],
  ): Promise<User> {
    return manager.save(
      User,
      manager.create(User, {
        name: owner.name,
        email: owner.email.toLowerCase().trim(),
        cpf: owner.cpf,
        password_hash: await bcrypt.hash(owner.password, SALT_ROUNDS),
        app_profile: AppProfile.CLIENT,
        profile_complete: true,
        email_verification_token: crypto.randomBytes(32).toString('hex'),
      }),
    );
  }

  private async ensureCnpjIsUnique(cnpj: string): Promise<void> {
    const existing = await this.unitRepository.findOne({ where: { cnpj } });
    if (existing) {
      throw new ConflictException({
        code: 'CNPJ_ALREADY_EXISTS',
        message: 'A butcher shop with this CNPJ already exists.',
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
