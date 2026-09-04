import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppCheckMiddleware } from './app-check.middleware';

describe('AppCheckMiddleware', () => {
  const next = jest.fn<() => void>();
  const enforcedConfig = {
    get: (name: string) => (name === 'FIREBASE_APP_CHECK_ENFORCED' ? 'true' : undefined),
  };

  beforeEach(() => {
    next.mockReset();
  });

  it('does not affect routes outside the protected list', async () => {
    const middleware = new AppCheckMiddleware(
      enforcedConfig as never,
      { verifyAppCheckToken: jest.fn() } as never,
    );
    await middleware.use(
      { header: () => undefined, path: '/health', originalUrl: '/health' } as never,
      {} as never,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('requires and verifies attestation for mobile clients when enforced', async () => {
    const verify = jest.fn(async (_token: string) => ({ appId: 'app' }));
    const middleware = new AppCheckMiddleware(
      enforcedConfig as never,
      { verifyAppCheckToken: verify } as never,
    );
    const request = {
      path: '/auth/firebase-exchange',
      originalUrl: '/auth/firebase-exchange',
      header: (name: string) => (name === 'x-firebase-appcheck' ? 'proof' : undefined),
    };
    await middleware.use(request as never, {} as never, next);
    expect(verify).toHaveBeenCalledWith('proof');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a mobile request without attestation', async () => {
    const middleware = new AppCheckMiddleware(
      enforcedConfig as never,
      { verifyAppCheckToken: jest.fn() } as never,
    );
    const request = {
      path: '/auth/firebase-exchange',
      originalUrl: '/auth/firebase-exchange',
      header: () => undefined,
    };
    await expect(middleware.use(request as never, {} as never, next)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
