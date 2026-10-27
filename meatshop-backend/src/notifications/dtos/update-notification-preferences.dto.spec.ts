import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateNotificationPreferencesDto } from './update-notification-preferences.dto';

describe('notification preference validation', () => {
  it.each([null, 'false', 0])('rejects non-boolean preference %s', async (value) => {
    const dto = plainToInstance(UpdateNotificationPreferencesDto, { orders_enabled: value });
    expect(await validate(dto)).not.toHaveLength(0);
  });
  it('accepts partial updates with real booleans', async () => {
    const dto = plainToInstance(UpdateNotificationPreferencesDto, { orders_enabled: false });
    expect(await validate(dto)).toHaveLength(0);
  });
});
