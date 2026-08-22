import { ForbiddenException } from '@nestjs/common';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { LocalRole } from '../../common/enums/local-role.enum';
import { CreateUnitMemberUseCase } from './create-unit-member.use-case';

describe('CreateUnitMemberUseCase', () => {
  const unit = { id: 10, admin_id: 1 };
  const unitRepository = { findOne: jest.fn().mockResolvedValue(unit) };
  const userRepository = { findOne: jest.fn().mockResolvedValue(null) };
  const authorization = { assertHasPermission: jest.fn().mockResolvedValue(undefined) };
  const manager = {
    create: jest.fn((_entity, data) => data),
    save: jest.fn().mockImplementation((_entity, data) => Promise.resolve({ id: 20, user_id: 20, ...data })),
  };
  const dataSource = { transaction: jest.fn((callback) => callback(manager)) };

  const useCase = new CreateUnitMemberUseCase(
    unitRepository as never,
    userRepository as never,
    dataSource as never,
    authorization as never,
  );

  const dto = {
    name: 'Maria Silva', email: 'maria@example.com', cpf: '12345678901',
    password: 'SenhaTemporaria123!', local_role: LocalRole.OPERATOR as const,
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates an operator and membership in one transaction', async () => {
    const result = await useCase.execute(10, dto, { id: 1, global_role: GlobalRole.USER } as never);
    expect(authorization.assertHasPermission).toHaveBeenCalled();
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(result.local_role).toBe(LocalRole.OPERATOR);
  });

  it('prevents a manager from creating another manager', async () => {
    await expect(useCase.execute(
      10,
      { ...dto, local_role: LocalRole.MANAGER },
      { id: 2, global_role: GlobalRole.USER } as never,
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
