import { Injectable } from '@nestjs/common';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';

const ALL_PERMISSIONS = Object.values(UnitPermission);

const ROLE_PERMISSIONS: Record<LocalRole, readonly UnitPermission[]> = {
  [LocalRole.OWNER]: ALL_PERMISSIONS,
  [LocalRole.MANAGER]: [
    UnitPermission.VIEW_DASHBOARD,
    UnitPermission.MANAGE_ORDERS,
    UnitPermission.MANAGE_PRODUCTS,
    UnitPermission.MANAGE_CATEGORIES,
    UnitPermission.VIEW_FINANCE,
    UnitPermission.MANAGE_FINANCE,
    UnitPermission.MANAGE_MEMBERS,
  ],
  [LocalRole.OPERATOR]: [
    UnitPermission.VIEW_DASHBOARD,
    UnitPermission.MANAGE_ORDERS,
    UnitPermission.MANAGE_PRODUCTS,
    UnitPermission.MANAGE_CATEGORIES,
  ],
  [LocalRole.DELIVERY]: [],
};

@Injectable()
export class UnitPermissionPolicy {
  permissionsFor(role: LocalRole): UnitPermission[] {
    return [...ROLE_PERMISSIONS[role]];
  }

  has(role: LocalRole, permission: UnitPermission): boolean {
    return ROLE_PERMISSIONS[role].includes(permission);
  }

  canAccessPanel(role: LocalRole): boolean {
    return this.permissionsFor(role).length > 0;
  }
}
