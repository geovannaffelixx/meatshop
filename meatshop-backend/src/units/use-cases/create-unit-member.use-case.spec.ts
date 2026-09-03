import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { LocalRole } from '../../common/enums/local-role.enum';
import { CreateUnitMemberUseCase } from './create-unit-member.use-case';

describe('CreateUnitMemberUseCase', () => {
  const unit = { id: 10, admin_id: 1 };
  const unitRepository = {
    findOne: jest.fn<() => Promise<typeof unit>>().mockResolvedValue(unit),
  };
  const userRepository = {
    findOne: jest.fn<() => Promise<null>>().mockResolvedValue(null),
  };
  const authorization = {
    assertHasPermission: jest.fn<() => Promise<void>>().mockResolvedValue(),
  };
  const manager = {
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => data),
    save: jest
      .fn<(entity: unknown, data: Record<string, unknown>) => Promise<Record<string, unknown>>>()
      .mockImplementation((_entity, data) => Promise.resolve({ id: 20, user_id: 20, ...data })),
  };
  const dataSource = {
    transaction: jest.fn((callback: (entityManager: typeof manager) => unknown) =>
      callback(manager),
    ),
  };
  const firebase = {
    createPasswordUser: jest
      .fn<() => Promise<{ uid: string }>>()
      .mockResolvedValue({ uid: 'firebase-member' }),
    deleteUser: jest.fn<() => Promise<void>>().mockResolvedValue(),
  };

  const useCase = new CreateUnitMemberUseCase(
    unitRepository as never,
    userRepository as never,
    dataSource as never,
    authorization as never,
    firebase as never,
  );

  const dto = {
    name: 'Maria Silva',
    email: 'maria@example.com',
    cpf: '12345678901',
    password: 'SenhaTemporaria123!',
    local_role: LocalRole.OPERATOR as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an operator and membership in one transaction', async () => {
    const result = await useCase.execute(10, dto, { id: 1, global_role: GlobalRole.USER } as never);
    expect(authorization.assertHasPermission).toHaveBeenCalled();
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(firebase.createPasswordUser).toHaveBeenCalledWith({
      email: dto.email,
      password: dto.password,
      displayName: dto.name,
    });
    expect(result.local_role).toBe(LocalRole.OPERATOR);
  });

  it('prevents a manager from creating another manager', async () => {
    await expect(
      useCase.execute(10, { ...dto, local_role: LocalRole.MANAGER }, {
        id: 2,
        global_role: GlobalRole.USER,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
