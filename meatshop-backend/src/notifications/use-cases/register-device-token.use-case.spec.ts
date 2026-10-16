import { RegisterDeviceTokenUseCase } from './register-device-token.use-case';
import { describe, expect, it, jest } from '@jest/globals';

describe('RegisterDeviceTokenUseCase', () => {
  it('atomically registers or moves a token to the authenticated user', async () => {
    const repository = { upsert: jest.fn(async () => undefined) };
    const useCase = new RegisterDeviceTokenUseCase(repository as never);
    await useCase.execute({ fcm_token: 'token', platform: 'ANDROID', app_version: '3.1.0' }, {
      id: 42,
    } as never);
    expect(repository.upsert).toHaveBeenCalledWith(
      {
        user_id: 42,
        fcm_token: 'token',
        platform: 'ANDROID',
        app_version: '3.1.0',
        last_seen_at: expect.any(Date),
      },
      ['fcm_token'],
    );
  });
  it('does not replace an existing platform when the caller omits it', async () => {
    const repository = { upsert: jest.fn(async () => undefined) };
    await new RegisterDeviceTokenUseCase(repository as never).execute({ fcm_token: 'token' }, {
      id: 42,
    } as never);
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ platform: expect.anything() }),
      ['fcm_token'],
    );
  });
});
