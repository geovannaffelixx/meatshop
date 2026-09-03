import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { AppProfile } from '../../common/enums/app-profile.enum';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { DeliveryPersonStatus } from '../../delivery/enums/delivery-person-status.enum';
import { DeliveryAffiliationType } from '../../delivery/enums/delivery-affiliation-type.enum';
import { User } from '../../users/entities/user.entity';
import { CreateUnitMemberDto } from '../dtos/create-unit-member.dto';
import { Unit } from '../entities/unit.entity';
import { UserUnit } from '../entities/user-unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';
import { FirebaseService } from '../../integrations/firebase/firebase.service';

@Injectable()
export class CreateUnitMemberUseCase {
  private readonly logger = new Logger(CreateUnitMemberUseCase.name);

  constructor(
    @InjectRepository(Unit) private readonly unitRepository: Repository<Unit>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorization: UnitAuthorizationService,
    private readonly firebase: FirebaseService,
  ) {}

  async execute(unitId: number, dto: CreateUnitMemberDto, actor: User) {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    await this.authorization.assertHasPermission(actor, unitId, UnitPermission.MANAGE_MEMBERS);
    this.assertCanAssignRole(unit, actor, dto.local_role);
    await this.assertUserDoesNotExist(dto.email, dto.cpf);

    const firebaseUser = await this.firebase.createPasswordUser({
      email: dto.email.toLowerCase().trim(),
      password: dto.password,
      displayName: dto.name.trim(),
    });
    let membership: UserUnit;
    try {
      membership = await this.dataSource.transaction(async (manager) => {
        const user = await manager.save(
          User,
          manager.create(User, {
            name: dto.name.trim(),
            email: dto.email.toLowerCase().trim(),
            cpf: dto.cpf,
            password_hash: await bcrypt.hash(dto.password, 12),
            app_profile:
              dto.local_role === LocalRole.DELIVERY ? AppProfile.DELIVERY : AppProfile.CLIENT,
            firebase_uid: firebaseUser.uid,
            email_verified: true,
          }),
        );
        const savedMembership = await manager.save(
          UserUnit,
          manager.create(UserUnit, {
            user_id: user.id,
            unit_id: unitId,
            local_role: dto.local_role,
          }),
        );
        if (dto.local_role === LocalRole.DELIVERY && dto.vehicle) {
          await manager.save(
            DeliveryPerson,
            manager.create(DeliveryPerson, {
              user_id: user.id,
              vehicle: dto.vehicle,
              status: DeliveryPersonStatus.PENDING,
              affiliation_type: DeliveryAffiliationType.UNIT,
            }),
          );
        }
        return savedMembership;
      });
    } catch (error) {
      await this.firebase.deleteUser(firebaseUser.uid).catch((cleanupError: unknown) => {
        this.logger.error(
          `Failed to compensate Firebase user ${firebaseUser.uid}`,
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
      });
      throw error;
    }

    this.logger.log(`User ${membership.user_id} created in unit ${unitId} by user ${actor.id}`);
    return membership;
  }

  private assertCanAssignRole(unit: Unit, actor: User, role: LocalRole): void {
    const isOwner = unit.admin_id === actor.id;
    const isSuperAdmin = actor.global_role === GlobalRole.SUPER_ADMIN;
    if (role === LocalRole.MANAGER && !isOwner && !isSuperAdmin) {
      throw new ForbiddenException('Only the unit owner can create managers');
    }
  }

  private async assertUserDoesNotExist(email: string, cpf: string): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: [{ email: email.toLowerCase().trim() }, { cpf }],
    });
    if (!existing) return;
    if (existing.email === email.toLowerCase().trim()) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Já existe uma conta cadastrada com este e-mail.',
      });
    }
    throw new ConflictException({
      code: 'CPF_ALREADY_EXISTS',
      message: 'Já existe uma conta cadastrada com este CPF.',
    });
  }
}
