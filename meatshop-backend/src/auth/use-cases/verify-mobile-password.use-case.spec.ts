import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { VerifyMobilePasswordUseCase } from './verify-mobile-password.use-case';

jest.mock('../services/credential-attempts.service', () => ({
  CredentialAttemptsService: jest.fn().mockImplementation(() => ({
    authenticate: async (_email: string, verify: () => Promise<unknown>) => verify(),
  })),
}));

describe('VerifyMobilePasswordUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['development', 'test', 'production'])(
    'uses the correct identity endpoint in %s',
    async (environment) => {
      const fetch = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new globalThis.Response('{}', { status: 200 }));
      const useCase = new VerifyMobilePasswordUseCase(
        {} as DataSource,
        new ConfigService({
          NODE_ENV: environment,
          FIREBASE_WEB_API_KEY: 'test-key',
          FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
        }),
      );

      await expect(useCase.execute('client@meatshop.local', 'test-password')).resolves.toEqual({
        allowed: true,
      });
      const origin =
        environment === 'production'
          ? 'https://identitytoolkit.googleapis.com'
          : 'http://127.0.0.1:9099/identitytoolkit.googleapis.com';
      expect(fetch).toHaveBeenCalledWith(
        `${origin}/v1/accounts:signInWithPassword?key=test-key`,
        expect.objectContaining({ method: 'POST' }),
      );
    },
  );

  it('keeps rejecting invalid passwords when using the emulator', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new globalThis.Response(JSON.stringify({ error: { message: 'INVALID_PASSWORD' } }), {
        status: 400,
      }),
    );
    const useCase = new VerifyMobilePasswordUseCase(
      {} as DataSource,
      new ConfigService({
        NODE_ENV: 'development',
        FIREBASE_WEB_API_KEY: 'test-key',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      }),
    );
    await expect(useCase.execute('client@meatshop.local', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('reports an unavailable identity service without approving authentication', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));
    const useCase = new VerifyMobilePasswordUseCase(
      {} as DataSource,
      new ConfigService({ FIREBASE_WEB_API_KEY: 'test-key' }),
    );
    await expect(useCase.execute('client@meatshop.local', 'test-password')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
