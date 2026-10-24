import { jest } from '@jest/globals';
import type { User } from '../../users/entities/user.entity';
import type { NotificationPreference } from '../entities/notification-preference.entity';
import { ManageNotificationPreferencesUseCase } from './manage-notification-preferences.use-case';

describe('ManageNotificationPreferencesUseCase', () => {
  it('creates opt-in defaults and persists subsequent changes', async () => {
    let findCalls = 0;
    const defaults = {
      user_id: 4,
      orders_enabled: true,
      delivery_enabled: true,
      promotions_enabled: true,
      system_enabled: true,
    } as NotificationPreference;
    const save = jest.fn(async (value: NotificationPreference) => value);
    const repository = {
      findOne: jest.fn(async () => (findCalls++ === 0 ? null : defaults)),
      upsert: jest.fn(async () => ({})),
      findOneByOrFail: jest.fn(async () => defaults),
      save,
    };
    const useCase = new ManageNotificationPreferencesUseCase(repository as never);
    const user = { id: 4 } as User;

    await expect(useCase.get(user)).resolves.toMatchObject({
      user_id: 4,
      promotions_enabled: true,
    });
    await expect(useCase.update({ promotions_enabled: false }, user)).resolves.toMatchObject({
      promotions_enabled: false,
    });
    expect(repository.upsert).toHaveBeenCalledWith(
      { user_id: 4 },
      { conflictPaths: ['user_id'], skipUpdateIfNoValuesChanged: true },
    );
    expect(save).toHaveBeenCalledTimes(1);
  });
});
