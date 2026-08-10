import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { User } from '../../users/entities/user.entity';
import { UpdateUnitDto } from '../dtos/update-unit.dto';
import { Unit } from '../entities/unit.entity';

@Injectable()
export class UpdateUnitUseCase {
  private readonly logger = new Logger(UpdateUnitUseCase.name);

  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async execute(
    unitId: number,
    dto: UpdateUnitDto,
    currentUser: User,
  ): Promise<Unit> {
    const unit = await this.unitRepository.findOne({ where: { id: unitId } });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    this.assertCanManageUnit(unit, currentUser);

    Object.assign(unit, dto);
    await this.unitRepository.save(unit);

    this.logger.log(`Unit ${unit.id} updated by user ${currentUser.id}`);

    return unit;
  }

  private assertCanManageUnit(unit: Unit, currentUser: User): void {
    const isOwner = unit.admin_id === currentUser.id;
    const isSuperAdmin = currentUser.global_role === GlobalRole.SUPER_ADMIN;

    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException(
        'Only the unit admin or a super admin can perform this action',
      );
    }
  }
}
