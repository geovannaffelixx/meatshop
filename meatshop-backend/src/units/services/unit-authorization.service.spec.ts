/* global jest */
import { ForbiddenException } from '@nestjs/common';
import { UnitAuthorizationService } from './unit-authorization.service';
import { UnitPermissionPolicy } from './unit-permission.policy';
import { UnitPermission } from '../../common/enums/unit-permission.enum';

describe('Unit authorization boundaries', () => {
  function setup(role?: string) {
    const legal = { assertUnit: jest.fn().mockResolvedValue(undefined) };
    const memberships = {
      findOne: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          where.unit_id === 1 && role
            ? { user_id: 7, unit_id: 1, local_role: role, status: 'ACTIVE' }
            : null,
        ),
    };
    const service = new UnitAuthorizationService(
      legal as never,
      {} as never,
      memberships as never,
      new UnitPermissionPolicy(),
    );
    return { service, memberships, legal };
  }
  const user = { id: 7, global_role: 'USER' } as never;
  it('does not let a manager access another unit by changing unit_id', async () => {
    const { service, legal } = setup('MANAGER');
    await expect(
      service.assertHasPermission(user, 2, UnitPermission.VIEW_FINANCE),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(legal.assertUnit).not.toHaveBeenCalled();
  });
  it('uses the stored role instead of trusting a role submitted by the client', async () => {
    const { service, memberships } = setup('OPERATOR');
    await expect(
      service.assertHasPermission(user, 1, UnitPermission.MANAGE_FINANCE),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(memberships.findOne).toHaveBeenCalledWith({
      where: { user_id: 7, unit_id: 1, status: 'ACTIVE' },
    });
  });
  it('allows an operation granted by the active membership', async () => {
    const { service, legal } = setup('OPERATOR');
    await service.assertHasPermission(user, 1, UnitPermission.MANAGE_ORDERS);
    expect(legal.assertUnit).toHaveBeenCalledWith(1);
  });
  it('rejects an account without an active membership', async () => {
    const { service } = setup();
    await expect(
      service.assertHasPermission(user, 1, UnitPermission.MANAGE_PRODUCTS),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
