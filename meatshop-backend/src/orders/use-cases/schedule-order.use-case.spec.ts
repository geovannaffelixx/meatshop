import { jest } from '@jest/globals';
import { ScheduleOrderUseCase } from './schedule-order.use-case';
import { OrderStatus } from '../enums/order-status.enum';

describe('ScheduleOrderUseCase', () => {
  function setup(status = OrderStatus.PENDING) {
    const order = { id: 12, client_id: 4, unit_id: 6, status };
    const query = {
      setLock: jest.fn(),
      where: jest.fn(),
      getOne: jest.fn(async () => ({ ...order })),
    };
    query.setLock.mockReturnValue(query);
    query.where.mockReturnValue(query);
    const manager = {
      getRepository: jest.fn(() => ({ createQueryBuilder: () => query })),
      save: jest.fn(async (_entity: unknown, value: unknown) => value),
    };
    const dataSource = {
      transaction: jest.fn(async (callback: (value: typeof manager) => Promise<unknown>) =>
        callback(manager),
      ),
    };
    const authorization = { assertCanManageOrder: jest.fn(async () => undefined) };
    const availability = { assertAvailable: jest.fn(async () => undefined) };
    const repository = { findOne: jest.fn(async () => order) };
    const useCase = new ScheduleOrderUseCase(
      repository as never,
      authorization as never,
      availability as never,
      dataSource as never,
    );
    const dto = { scheduled_delivery_date: '2099-10-21T10:00:00-03:00' };
    return { useCase, dto, manager, availability, authorization, dataSource };
  }

  it.each([OrderStatus.PENDING, OrderStatus.CONFIRMED])(
    'revalidates %s orders with their own ID excluded from capacity',
    async (status) => {
      const { useCase, dto, availability, manager } = setup(status);
      await expect(useCase.execute(12, dto, { id: 4 } as never)).resolves.toMatchObject({
        is_scheduled: true,
      });
      expect(availability.assertAvailable).toHaveBeenCalledWith(
        6,
        new Date(dto.scheduled_delivery_date),
        manager,
        12,
      );
    },
  );

  it.each([OrderStatus.PREPARING, OrderStatus.DELIVERED, OrderStatus.CANCELLED])(
    'rejects %s orders without saving',
    async (status) => {
      const { useCase, dto, manager, availability } = setup(status);
      await expect(useCase.execute(12, dto, { id: 4 } as never)).rejects.toThrow();
      expect(availability.assertAvailable).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    },
  );

  it('rejects another customer before starting a transaction', async () => {
    const { useCase, dto, authorization, dataSource } = setup();
    authorization.assertCanManageOrder.mockRejectedValueOnce(new Error('forbidden'));
    await expect(useCase.execute(12, dto, { id: 9 } as never)).rejects.toThrow('forbidden');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('does not save when the selected interval becomes full', async () => {
    const { useCase, dto, availability, manager } = setup();
    availability.assertAvailable.mockRejectedValueOnce(new Error('SCHEDULE_SLOT_FULL'));
    await expect(useCase.execute(12, dto, { id: 4 } as never)).rejects.toThrow(
      'SCHEDULE_SLOT_FULL',
    );
    expect(manager.save).not.toHaveBeenCalled();
  });
});
