import { beforeEach, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { GlobalRole } from '../common/enums/global-role.enum';
import { LocalRole } from '../common/enums/local-role.enum';
import { UserUnitStatus } from '../common/enums/user-unit-status.enum';
import { Unit } from '../units/entities/unit.entity';
import type { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import type { User } from '../users/entities/user.entity';
import { ReportAccessService } from './report-access.service';

describe('Report authorization', () => {
  const user = { id: 7, global_role: GlobalRole.USER } as User;
  const unit = { id: 1, name: 'Unidade' };
  const membership = { findOneBy: jest.fn<() => Promise<{ local_role: LocalRole } | null>>() };
  const units = {
    findOneBy: jest.fn<() => Promise<Unit>>().mockResolvedValue(unit as Unit),
    find: jest.fn(),
  };
  const db = {
    getRepository: jest.fn((entity) => (entity === Unit ? units : membership)),
    query: jest.fn<() => Promise<unknown[]>>(),
  };
  const authorization = {
    resolveRequiredUnitId: jest.fn<() => Promise<number>>().mockResolvedValue(1),
  };
  const service = new ReportAccessService(
    db as unknown as DataSource,
    authorization as unknown as UnitAuthorizationService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([LocalRole.OWNER, LocalRole.MANAGER])(
    'allows active %s in the requested unit',
    async (role) => {
      membership.findOneBy.mockResolvedValue({ local_role: role });
      await expect(service.assert(user, 1, 'xlsx')).resolves.toEqual(unit);
      expect(membership.findOneBy).toHaveBeenCalledWith({
        user_id: 7,
        unit_id: 1,
        status: UserUnitStatus.ACTIVE,
      });
    },
  );
  it.each([LocalRole.OPERATOR, LocalRole.DELIVERY, null])(
    'rejects %s even with a manually crafted request',
    async (role) => {
      membership.findOneBy.mockResolvedValue(role ? { local_role: role } : null);
      await expect(service.assert(user, 2, 'pdf')).rejects.toBeInstanceOf(ForbiddenException);
      expect(authorization.resolveRequiredUnitId).not.toHaveBeenCalled();
      expect(units.findOneBy).not.toHaveBeenCalled();
    },
  );
  it('rejects JSON for unit managers', async () => {
    membership.findOneBy.mockResolvedValue({ local_role: LocalRole.MANAGER });
    await expect(service.assert(user, 1, 'json')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('allows admin JSON without requiring unit membership', async () => {
    await expect(
      service.assert({ ...user, global_role: GlobalRole.SUPER_ADMIN } as User, 1, 'json'),
    ).resolves.toEqual(unit);
    expect(membership.findOneBy).not.toHaveBeenCalled();
  });
  it('does not expose the administrative unit picker to ordinary users', async () => {
    await expect(service.units(user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(units.find).not.toHaveBeenCalled();
  });
  it('loads reviewed products only after authorizing the selected unit', async () => {
    membership.findOneBy.mockResolvedValue({ local_role: LocalRole.MANAGER });
    db.query.mockResolvedValue([{ id: 10, name: 'Picanha' }]);
    await expect(service.reviewProducts(user, 1)).resolves.toEqual([{ id: 10, name: 'Picanha' }]);
    expect(authorization.resolveRequiredUnitId).toHaveBeenCalledWith(user, 1, expect.anything());
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('r.unit_id=$1'), [1]);
  });
});
