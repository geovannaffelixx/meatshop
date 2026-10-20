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
    query: jest.fn(),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(async (operation: (value: EntityManager) => Promise<void>) =>
      operation(manager),
    ),
  } as unknown as DataSource;
  const firebase = {
    deleteUser: jest.fn(async () => undefined),
    verifyIdToken: jest.fn(async () => ({
      uid: 'firebase-12',
      auth_time: Math.floor(Date.now() / 1000),
    })),
  };
  const useCase = new DeleteAccountUseCase(dataSource, firebase as never);

  it('revokes sessions and anonymizes personal data while preserving operational history', async () => {
    jest.mocked(manager.findOne).mockResolvedValue({ id: 12, firebase_uid: 'firebase-12' } as User);
    await useCase.execute(12, 'recent-identity-token');

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

  it('fails without changing data when the account does not exist', async () => {
    jest.mocked(manager.findOne).mockResolvedValue(null);
    await expect(useCase.execute(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects deletion without a recent confirmation of the Firebase identity', async () => {
    jest.mocked(manager.findOne).mockResolvedValue({ id: 12, firebase_uid: 'firebase-12' } as User);
    const previousCalls = firebase.deleteUser.mock.calls.length;
    await expect(useCase.execute(12)).rejects.toMatchObject({ status: 401 });
    expect(firebase.deleteUser.mock.calls.length).toBe(previousCalls);
  });

  it('rejects a confirmation from another Firebase identity', async () => {
    jest.mocked(manager.findOne).mockResolvedValue({ id: 12, firebase_uid: 'firebase-12' } as User);
    firebase.verifyIdToken.mockResolvedValueOnce({
      uid: 'another-user',
      auth_time: Math.floor(Date.now() / 1000),
    });
    await expect(useCase.execute(12, 'wrong-identity')).rejects.toMatchObject({
      status: 401,
    });
  });
});
