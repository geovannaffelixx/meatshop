import { LocalRole } from '../../common/enums/local-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { UnitPermissionPolicy } from './unit-permission.policy';

describe('UnitPermissionPolicy', () => {
  const policy = new UnitPermissionPolicy();

  it('gives every permission to the owner', () => {
    expect(policy.permissionsFor(LocalRole.OWNER)).toEqual(expect.arrayContaining(Object.values(UnitPermission)));
  });

  it('prevents managers from changing unit ownership settings', () => {
    expect(policy.has(LocalRole.MANAGER, UnitPermission.MANAGE_MEMBERS)).toBe(true);
    expect(policy.has(LocalRole.MANAGER, UnitPermission.MANAGE_UNIT)).toBe(false);
  });

  it('limits operators to operational features', () => {
    expect(policy.has(LocalRole.OPERATOR, UnitPermission.MANAGE_ORDERS)).toBe(true);
    expect(policy.has(LocalRole.OPERATOR, UnitPermission.VIEW_FINANCE)).toBe(false);
  });

  it('does not grant panel access to delivery memberships', () => {
    expect(policy.canAccessPanel(LocalRole.DELIVERY)).toBe(false);
    expect(policy.permissionsFor(LocalRole.DELIVERY)).toEqual([]);
  });
});
