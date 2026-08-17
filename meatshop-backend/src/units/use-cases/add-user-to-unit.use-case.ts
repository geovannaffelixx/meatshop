import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreateUserUnitDto } from '../dtos/create-user-unit.dto';
import { Unit } from '../entities/unit.entity';
import { UserUnit } from '../entities/user-unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';

@Injectable()
export class AddUserToUnitUseCase {
  private readonly logger = new Logger(AddUserToUnitUseCase.name);

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly userUnitRepository: Repository<UserUnit>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(
    unitId: number,
    dto: CreateUserUnitDto,
    currentUser: User,
  ): Promise<UserUnit> {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    this.unitAuthorizationService.assertCanManageUnit(unit, currentUser);

    const targetUser = await this.userRepository.findOne({
      where: { id: dto.user_id },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    await this.ensureNotAlreadyMember(dto.user_id, unitId);

    const userUnit = this.userUnitRepository.create({
      user_id: dto.user_id,
      unit_id: unitId,
      local_role: dto.local_role,
    });
    await this.userUnitRepository.save(userUnit);

    this.logger.log(
      `User ${dto.user_id} added to unit ${unitId} by user ${currentUser.id}`,
    );

    return userUnit;
  }

  private async ensureNotAlreadyMember(
    userId: number,
    unitId: number,
  ): Promise<void> {
    const existing = await this.userUnitRepository.findOne({
      where: { user_id: userId, unit_id: unitId },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this unit');
    }
  }
}
