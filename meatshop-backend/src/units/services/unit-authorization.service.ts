import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { User } from '../../users/entities/user.entity';
import { Unit } from '../entities/unit.entity';
import { UserUnit } from '../entities/user-unit.entity';

@Injectable()
export class UnitAuthorizationService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly userUnitRepository: Repository<UserUnit>,
  ) {}

  assertCanManageUnit(unit: Unit, currentUser: User): void {
    const isOwner = unit.admin_id === currentUser.id;
    const isSuperAdmin = currentUser.global_role === GlobalRole.SUPER_ADMIN;

    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException('Only the unit admin or a super admin can perform this action');
    }
  }

  async getManagedUnitIds(userId: number): Promise<number[]> {
    const ownedUnits = await this.unitRepository.find({ where: { admin_id: userId } });
    const memberships = await this.userUnitRepository.find({
      where: { user_id: userId, status: UserUnitStatus.ACTIVE },
    });

    const ids = new Set<number>([
      ...ownedUnits.map((u) => u.id),
      ...memberships.map((m) => m.unit_id),
    ]);
    return Array.from(ids);
  }

  /**
   * Resolves which single unit a management/report endpoint should be scoped to.
   * A SUPER_ADMIN must always specify `requestedUnitId` explicitly (there is no
   * "whole platform" report — mixing every unit's finances is never meaningful).
   * A unit admin/staff member with exactly one managed unit gets it as a default;
   * with more than one, they must specify which one.
   */
  async resolveRequiredUnitId(currentUser: User, requestedUnitId?: number): Promise<number> {
    const isSuperAdmin = currentUser.global_role === GlobalRole.SUPER_ADMIN;

    if (isSuperAdmin) {
      if (!requestedUnitId) {
        throw new BadRequestException('unit_id is required');
      }
      return requestedUnitId;
    }

    const managedUnitIds = await this.getManagedUnitIds(currentUser.id);

    if (requestedUnitId) {
      if (!managedUnitIds.includes(requestedUnitId)) {
        throw new ForbiddenException('You do not manage this unit');
      }
      return requestedUnitId;
    }

    if (managedUnitIds.length === 0) {
      throw new ForbiddenException('You do not manage any unit');
    }
    if (managedUnitIds.length > 1) {
      throw new BadRequestException('unit_id is required: you manage more than one unit');
    }
    return managedUnitIds[0];
  }
}
