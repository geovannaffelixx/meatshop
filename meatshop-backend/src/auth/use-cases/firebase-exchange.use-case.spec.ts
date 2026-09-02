import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { FirebaseExchangeUseCase } from './firebase-exchange.use-case';

jest.mock('../../integrations/firebase/firebase.service', () => ({
  FirebaseService: class FirebaseService {},
}));

describe('FirebaseExchangeUseCase', () => {
  const identity = {
    uid: 'firebase-uid',
    email: 'user@example.com',
    email_verified: true,
    name: 'User',
  } as any;

  function fixture(existing: any[] = []) {
    const saved: any[] = [];
    const users = {
      findOne: jest.fn(
        async ({ where }: any) =>
          existing.find((user) =>
            where.firebase_uid
              ? user.firebase_uid === where.firebase_uid
              : user.email === where.email,
          ) ?? null,
      ),
      create: jest.fn((value: any) => value),
      save: jest.fn(async (value: any) => {
        const user = { id: value.id ?? 10, created_at: new Date(), ...value };
        saved.push(user);
        return user;
      }),
    };
    const firebase = { verifyIdToken: jest.fn(async () => identity) };
    const login = {
      execute: jest.fn(async () => ({
        access_token: 'access',
        refresh_token: 'refresh',
      })),
    };
    const useCase = new FirebaseExchangeUseCase(users as any, firebase as any, login as any);
    return { useCase, users, firebase, login, saved };
  }

  it('creates an incomplete PostgreSQL profile without fictitious role or CPF', async () => {
    const { useCase, users } = fixture();

    const result = await useCase.execute('firebase-token');

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        firebase_uid: identity.uid,
        email: identity.email,
        cpf: null,
        app_profile: null,
        profile_complete: false,
        global_role: GlobalRole.USER,
      }),
    );
    expect(result).toMatchObject({
      access_token: 'access',
      refresh_token: 'refresh',
      user: { profile_complete: false },
    });
  });

  it('requires the current password before linking an existing local account', async () => {
    const localUser = {
      id: 1,
      email: identity.email,
      firebase_uid: null,
      password_hash: 'hash',
      is_active: true,
    };
    const { useCase } = fixture([localUser]);

    await expect(useCase.execute('firebase-token')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_LINK_REQUIRED' }),
    });
  });

  it('links after validating the local password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const localUser = {
      id: 1,
      name: 'Existing',
      email: identity.email,
      cpf: '12345678901',
      phone: '11999999999',
      firebase_uid: null,
      password_hash: passwordHash,
      app_profile: 'CLIENT',
      global_role: GlobalRole.USER,
      profile_complete: true,
      is_active: true,
      locked_until: null,
      created_at: new Date(),
      avatar_url: null,
    };
    const { useCase, users } = fixture([localUser]);

    await useCase.execute('firebase-token', 'correct-password');

    expect(localUser.firebase_uid).toBe(identity.uid);
    expect(users.save).toHaveBeenCalledWith(localUser);
  });

  it('rejects an unverified Firebase email', async () => {
    const { useCase, firebase } = fixture();
    firebase.verifyIdToken.mockResolvedValueOnce({
      ...identity,
      email_verified: false,
    });

    await expect(useCase.execute('firebase-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
