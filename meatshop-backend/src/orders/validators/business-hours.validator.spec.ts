import { BusinessHoursValidator } from './business-hours.validator';
import { jest } from '@jest/globals';
import { Weekday } from '../../units/enums/weekday.enum';

describe('BusinessHoursValidator', () => {
  it('validates the opening minute in Sao Paulo using a UTC timestamp', async () => {
    const findOne = jest
      .fn<() => Promise<object>>()
      .mockResolvedValue({ is_open: true, opening_time: '10:00:00', closing_time: '12:00:00' });
    await expect(
      new BusinessHoursValidator({ findOne } as never).assertWithinBusinessHours(
        1,
        new Date('2026-10-19T13:00:00Z'),
      ),
    ).resolves.toBeUndefined();
    expect(findOne).toHaveBeenCalledWith({ where: { unit_id: 1, weekday: Weekday.MONDAY } });
  });

  it('uses the previous local weekday near midnight UTC', async () => {
    const findOne = jest.fn<() => Promise<object>>().mockResolvedValue({ is_open: false });
    await expect(
      new BusinessHoursValidator({ findOne } as never).assertWithinBusinessHours(
        1,
        new Date('2026-10-19T02:00:00Z'),
      ),
    ).rejects.toThrow();
    expect(findOne).toHaveBeenCalledWith({ where: { unit_id: 1, weekday: Weekday.SUNDAY } });
  });
});
