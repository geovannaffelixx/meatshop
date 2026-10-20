import { jest } from '@jest/globals';
import { BusinessHours } from '../../units/entities/business-hours.entity';
import { Unit } from '../../units/entities/unit.entity';
import { SchedulingAvailabilityService } from './scheduling-availability.service';

function queryBuilder(result: unknown[], count = 0) {
  const query = {
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    groupBy: jest.fn(),
    getRawMany: jest.fn(async () => result),
    getCount: jest.fn(async () => count),
  };
  [query.select, query.addSelect, query.where, query.andWhere, query.groupBy].forEach((value) =>
    value.mockReturnValue(query),
  );
  return query;
}

describe('SchedulingAvailabilityService', () => {
  it('does not offer scheduling when a unit has no complete configuration', async () => {
    const units = { findOne: jest.fn(async () => ({ id: 1 })) };
    const hours = { findOne: jest.fn() };
    const orders = { createQueryBuilder: jest.fn() };
    const service = new SchedulingAvailabilityService(
      units as never,
      hours as never,
      orders as never,
    );

    await expect(service.listAvailable([1], '2099-10-21')).resolves.toEqual([]);
    expect(hours.findOne).not.toHaveBeenCalled();
    expect(orders.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns only common intervals that still have capacity', async () => {
    const units = {
      findOne: jest.fn(
        async ({ where }: { where: { id: number } }) =>
          ({
            id: where.id,
            scheduling_slot_minutes: where.id === 1 ? 30 : 60,
            scheduling_capacity: where.id === 1 ? 5 : 2,
          }) as Unit,
      ),
    };
    const hours = {
      findOne: jest.fn(
        async () =>
          ({ is_open: true, opening_time: '08:00', closing_time: '10:00' }) as BusinessHours,
      ),
    };
    const first = queryBuilder([{ starts_at: '2099-10-21T11:00:00.000Z', used: '5' }]);
    const second = queryBuilder([]);
    const orders = {
      createQueryBuilder: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second),
    };
    const service = new SchedulingAvailabilityService(
      units as never,
      hours as never,
      orders as never,
    );

    const slots = await service.listAvailable([1, 2], '2099-10-21');

    expect(slots.map((slot) => slot.time)).toEqual(['09:00']);
    expect(slots[0].remaining_capacity).toBe(2);
  });

  it('rejects a full interval', async () => {
    const units = {
      findOne: jest.fn(
        async () => ({ id: 1, scheduling_slot_minutes: 30, scheduling_capacity: 5 }) as Unit,
      ),
    };
    const hours = {
      findOne: jest.fn(
        async () =>
          ({ is_open: true, opening_time: '08:00', closing_time: '10:00' }) as BusinessHours,
      ),
    };
    const orders = { createQueryBuilder: jest.fn(() => queryBuilder([], 5)) };
    const service = new SchedulingAvailabilityService(
      units as never,
      hours as never,
      orders as never,
    );

    await expect(
      service.assertAvailable(1, new Date('2099-10-21T11:00:00.000Z')),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SCHEDULE_SLOT_FULL' }),
    });
  });

  it('locks a unit interval before counting capacity during checkout', async () => {
    const countQuery = queryBuilder([], 0);
    const unit = { id: 1, scheduling_slot_minutes: 30, scheduling_capacity: 5 } as Unit;
    const hours = {
      is_open: true,
      opening_time: '08:00',
      closing_time: '10:00',
    } as BusinessHours;
    const manager = {
      query: jest.fn(async () => []),
      getRepository: jest.fn((entity) => {
        if (entity === Unit) return { findOne: jest.fn(async () => unit) };
        if (entity === BusinessHours) return { findOne: jest.fn(async () => hours) };
        return { createQueryBuilder: jest.fn(() => countQuery) };
      }),
    };
    const service = new SchedulingAvailabilityService({} as never, {} as never, {} as never);
    const startsAt = new Date('2099-10-21T11:00:00.000Z');

    await service.assertAvailable(1, startsAt, manager as never);

    expect(manager.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `schedule:1:${startsAt.toISOString()}`,
    ]);
    expect(countQuery.getCount).toHaveBeenCalledTimes(1);
  });
});
