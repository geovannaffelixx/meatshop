import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { User } from '../../users/entities/user.entity';
import { Unit } from '../entities/unit.entity';
import { UnitAuthorizationService } from '../services/unit-authorization.service';

@Injectable()
export class GetUnitSettingsUseCase {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    private readonly authorization: UnitAuthorizationService,
  ) {}

  async execute(unitId: number, currentUser: User): Promise<Unit> {
    const unit = await this.units.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');
    await this.authorization.assertHasPermission(currentUser, unitId, UnitPermission.MANAGE_UNIT);
    return unit;
  }
}
