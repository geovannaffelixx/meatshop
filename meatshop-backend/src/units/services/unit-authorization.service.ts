import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { User } from '../../users/entities/user.entity';
import { Unit } from '../entities/unit.entity';
import { UserUnit } from '../entities/user-unit.entity';
import { UnitPermissionPolicy } from './unit-permission.policy';

@Injectable()
export class UnitAuthorizationService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly userUnitRepository: Repository<UserUnit>,
    private readonly permissionPolicy: UnitPermissionPolicy,
  ) {}

  assertCanManageUnit(unit: Unit, currentUser: User): void {
    const isOwner = unit.admin_id === currentUser.id;
    const isSuperAdmin = currentUser.global_role === GlobalRole.SUPER_ADMIN;

    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException('Only the unit admin or a super admin can perform this action');
    }
  }

  async getManagedUnitIds(
    userId: number,
    permission: UnitPermission = UnitPermission.VIEW_DASHBOARD,
  ): Promise<number[]> {
    const ownedUnits = await this.unitRepository.find({ where: { admin_id: userId } });
    const memberships = await this.userUnitRepository.find({
      where: { user_id: userId, status: UserUnitStatus.ACTIVE },
    });

    const ids = new Set<number>([
      ...ownedUnits.map((u) => u.id),
      ...memberships
        .filter(({ local_role }) => this.permissionPolicy.has(local_role, permission))
        .map((membership) => membership.unit_id),
    ]);
    return Array.from(ids);
  }

  async assertHasPermission(
    currentUser: User,
    unitId: number,
    permission: UnitPermission,
  ): Promise<void> {
    if (currentUser.global_role === GlobalRole.SUPER_ADMIN) return;

    const membership = await this.userUnitRepository.findOne({
      where: {
        user_id: currentUser.id,
        unit_id: unitId,
        status: UserUnitStatus.ACTIVE,
      },
    });

    if (!membership || !this.permissionPolicy.has(membership.local_role, permission)) {
      throw new ForbiddenException('Insufficient unit permissions');
    }
  }

  async getActivePanelMemberships(userId: number): Promise<UserUnit[]> {
    const memberships = await this.userUnitRepository.find({
      where: { user_id: userId, status: UserUnitStatus.ACTIVE },
      relations: { unit: true },
      order: { created_at: 'ASC' },
    });

    return memberships.filter(({ local_role }) => this.permissionPolicy.canAccessPanel(local_role));
  }

  /**
   * Resolves which single unit a management/report endpoint should be scoped to.
   * A SUPER_ADMIN must always specify `requestedUnitId` explicitly (there is no
   * "whole platform" report — mixing every unit's finances is never meaningful).
   * A unit admin/staff member with exactly one managed unit gets it as a default;
   * with more than one, they must specify which one.
   */
  async resolveRequiredUnitId(
    currentUser: User,
    requestedUnitId?: number,
    permission: UnitPermission = UnitPermission.VIEW_DASHBOARD,
  ): Promise<number> {
    const isSuperAdmin = currentUser.global_role === GlobalRole.SUPER_ADMIN;

    if (isSuperAdmin) {
      if (!requestedUnitId) {
        throw new BadRequestException('unit_id is required');
      }
      return requestedUnitId;
    }

    const managedUnitIds = await this.getManagedUnitIds(currentUser.id, permission);

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
