import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import type { DataSource, EntityManager } from 'typeorm';
import type { User } from '../entities/user.entity';
import { DeleteAccountUseCase } from './delete-account.use-case';

describe('DeleteAccountUseCase', () => {
  const manager = {
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(async (operation: (value: EntityManager) => Promise<void>) =>
      operation(manager),
    ),
  } as unknown as DataSource;
  const firebase = { deleteUser: jest.fn(async () => undefined) };
  const useCase = new DeleteAccountUseCase(dataSource, firebase as never);

  it('revoga sessões e anonimiza dados pessoais preservando histórico operacional', async () => {
    jest.mocked(manager.findOne).mockResolvedValue({ id: 12, firebase_uid: 'firebase-12' } as User);
    await useCase.execute(12);

    expect(manager.delete).toHaveBeenCalledWith('refresh_tokens', {
      user_id: 12,
    });
    expect(firebase.deleteUser).toHaveBeenCalledWith('firebase-12');
    expect(manager.delete).toHaveBeenCalledWith('user_device_tokens', {
      user_id: 12,
    });
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      12,
      expect.objectContaining({
        cpf: null,
        phone: null,
        firebase_uid: null,
        is_active: false,
      }),
    );
  });

  it('falha sem alterar dados quando a conta não existe', async () => {
    jest.mocked(manager.findOne).mockResolvedValue(null);
    await expect(useCase.execute(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
