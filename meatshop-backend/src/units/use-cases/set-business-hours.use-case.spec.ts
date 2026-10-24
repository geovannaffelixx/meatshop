import { jest } from '@jest/globals';
import { BusinessHours } from '../entities/business-hours.entity';
import { Weekday } from '../enums/weekday.enum';
import { SetBusinessHoursUseCase } from './set-business-hours.use-case';

describe('SetBusinessHoursUseCase', () => {
  function setup() {
    const unit = { id: 6, scheduling_slot_minutes: 30, scheduling_capacity: 1 };
    const units = { findOne: jest.fn(async () => unit), save: jest.fn(async () => unit) };
    const hours = { upsert: jest.fn(async () => ({})), find: jest.fn(async () => []) };
    const manager = {
      getRepository: jest.fn((entity: unknown) => (entity === BusinessHours ? hours : units)),
    };
    const transaction = jest.fn(async (callback: (value: typeof manager) => Promise<unknown>) =>
      callback(manager),
    );
    const authorization = { assertCanManageUnit: jest.fn(async () => undefined) };
    const useCase = new SetBusinessHoursUseCase(
      {} as never,
      { manager: { transaction } } as never,
      authorization as never,
    );
    const dto = {
      days: [
        { weekday: Weekday.MONDAY, is_open: true, opening_time: '08:00', closing_time: '18:00' },
      ],
      scheduling_slot_minutes: 60,
      scheduling_capacity: 2,
    };
    return { useCase, units, hours, authorization, transaction, dto };
  }

  it('updates hours and capacity using the same transaction and locked unit', async () => {
    const { useCase, units, hours, transaction, dto } = setup();
    await useCase.execute(6, dto, { id: 1 } as never);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(units.findOne).toHaveBeenCalledWith({
      where: { id: 6 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(units.save).toHaveBeenCalledWith(
      expect.objectContaining({ scheduling_slot_minutes: 60, scheduling_capacity: 2 }),
    );
    expect(hours.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects an incomplete pair before writing either resource', async () => {
    const { useCase, units, hours, dto } = setup();
    await expect(
      useCase.execute(
        6,
        { ...dto, scheduling_slot_minutes: null, scheduling_capacity: undefined },
        {} as never,
      ),
    ).rejects.toThrow();
    expect(units.save).not.toHaveBeenCalled();
    expect(hours.upsert).not.toHaveBeenCalled();
  });

  it('rejects duplicate weekdays and invalid ranges before opening a transaction', async () => {
    const { useCase, transaction, dto } = setup();
    await expect(
      useCase.execute(6, { days: [dto.days[0], dto.days[0]] }, {} as never),
    ).rejects.toThrow();
    await expect(
      useCase.execute(6, { days: [{ ...dto.days[0], closing_time: '07:00' }] }, {} as never),
    ).rejects.toThrow();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not change capacity for older clients that send hours only', async () => {
    const { useCase, units, hours, dto } = setup();
    await useCase.execute(6, { days: dto.days }, {} as never);
    expect(units.save).not.toHaveBeenCalled();
    expect(hours.upsert).toHaveBeenCalledTimes(1);
  });

  it('does not write data when authorization fails', async () => {
    const { useCase, authorization, units, hours, dto } = setup();
    authorization.assertCanManageUnit.mockRejectedValueOnce(new Error('forbidden'));
    await expect(useCase.execute(6, dto, {} as never)).rejects.toThrow('forbidden');
    expect(units.save).not.toHaveBeenCalled();
    expect(hours.upsert).not.toHaveBeenCalled();
  });
});
