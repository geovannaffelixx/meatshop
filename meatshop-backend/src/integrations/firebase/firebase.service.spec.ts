import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { deleteApp } from 'firebase-admin/app';
import { FirebaseService } from './firebase.service';
import type { Auth, UserRecord } from 'firebase-admin/auth';

describe('FirebaseService', () => {
  function identityService(record: Partial<UserRecord> | Error) {
    const service = new FirebaseService(new ConfigService({}));
    jest.spyOn(service as unknown as { auth(): Promise<Auth> }, 'auth').mockResolvedValue({
      getUser: async () => {
        if (record instanceof Error) throw record;
        return record as UserRecord;
      },
    } as unknown as Auth);
    return service;
  }

  it.each([
    [{ disabled: false }, true],
    [{ tokensValidAfterTime: '2026-10-26T10:00:00Z' }, true],
    [{ tokensValidAfterTime: '2026-10-26T11:00:01Z' }, false],
    [{ tokensValidAfterTime: 'invalid' }, false],
    [{ disabled: true }, false],
  ])('validates the original session against provider changes: %j', async (record, valid) => {
    const service = identityService(record);
    await expect(service.isSessionCurrent('uid', new Date('2026-10-26T11:00:00Z'))).resolves.toBe(
      valid,
    );
  });

  it('rejects a removed identity and fails closed for provider outages', async () => {
    const removed = Object.assign(new Error('removed'), { code: 'auth/user-not-found' });
    await expect(identityService(removed).isSessionCurrent('uid', new Date())).resolves.toBe(false);
    await expect(
      identityService(new Error('network')).isSessionCurrent('uid', new Date()),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('initializes token verification from the project id in development', async () => {
    const service = new FirebaseService(
      new ConfigService({
        NODE_ENV: 'development',
        FIREBASE_PROJECT_ID: 'meatshop-local-test',
      }),
    );

    const app = service.getApp();
    expect(app.options.projectId).toBe('meatshop-local-test');
    await deleteApp(app);
  });
});
