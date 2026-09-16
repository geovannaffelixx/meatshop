import { RegisterDeviceTokenUseCase } from './register-device-token.use-case';
import { describe, expect, it, jest } from '@jest/globals';

describe('RegisterDeviceTokenUseCase', () => {
  it('moves a refreshed token to the authenticated user and updates metadata', async () => {
    const existing = { id: 1, user_id: 8, fcm_token: 'token', platform: 'WEB' };
    const repository = {
      findOne: jest.fn(async () => existing),
      save: jest.fn(async (value: unknown) => value),
      create: jest.fn(),
    };
    const useCase = new RegisterDeviceTokenUseCase(repository as never);
    await useCase.execute({ fcm_token: 'token', platform: 'ANDROID', app_version: '3.0.0' }, {
      id: 42,
    } as never);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 42,
        platform: 'ANDROID',
        app_version: '3.0.0',
      }),
    );
    expect(existing).not.toHaveProperty('token');
  });
});
