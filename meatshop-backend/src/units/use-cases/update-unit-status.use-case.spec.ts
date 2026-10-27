import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { Unit } from '../entities/unit.entity';
import type { UnitAuthorizationService } from '../services/unit-authorization.service';
import { UpdateUnitStatusUseCase } from './update-unit-status.use-case';

describe('UpdateUnitStatusUseCase', () => {
  const build = (unit: Partial<Unit> | null, allowed = true) => {
    const save = jest.fn(async (value: Unit) => value);
    const assertCanManageUnit = jest.fn(async () => {
      if (!allowed) throw new ForbiddenException();
    });
    const useCase = new UpdateUnitStatusUseCase(
      { findOne: async () => unit, save } as unknown as Repository<Unit>,
      { assertCanManageUnit } as unknown as UnitAuthorizationService,
    );
    return { useCase, save, assertCanManageUnit };
  };

  it('lets the owner or a super admin deactivate the unit', async () => {
    const { useCase, save, assertCanManageUnit } = build({ id: 3, is_active: true });

    const result = await useCase.execute(3, { is_active: false }, { id: 7 } as User);

    expect(assertCanManageUnit).toHaveBeenCalled();
    expect(result.is_active).toBe(false);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 3, is_active: false }));
  });

  it('does not change the status without management rights', async () => {
    const { useCase, save } = build({ id: 3, is_active: true }, false);

    await expect(
      useCase.execute(3, { is_active: false }, { id: 8 } as User),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(save).not.toHaveBeenCalled();
  });

  it('returns not found for an unknown unit', async () => {
    const { useCase } = build(null);

    await expect(
      useCase.execute(99, { is_active: true }, { id: 7 } as User),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
