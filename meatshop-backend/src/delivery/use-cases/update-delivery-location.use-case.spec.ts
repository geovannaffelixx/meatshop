import { jest } from '@jest/globals';
import { validate } from 'class-validator';
import { UpdateDeliveryLocationUseCase } from './update-delivery-location.use-case';
import { UpdateLocationDto } from '../dtos/update-location.dto';

describe('Location ingestion invariants', () => {
  const dto = () =>
    Object.assign(new UpdateLocationDto(), {
      latitude: -23.5,
      longitude: -46.6,
      accuracy: 12.345678,
      captured_at: new Date().toISOString(),
      sample_id: '00000000-0000-4000-8000-000000000002',
      session_id: '00000000-0000-4000-8000-000000000001',
      is_mocked: false,
    });
  function setup(overrides: object = {}, last: unknown = null) {
    const order = {
      id: 1,
      status: 'OUT_FOR_DELIVERY',
      delivery_status: 'ON_THE_WAY',
      delivery_person_id: 4,
      tracking_session_id: dto().session_id,
      tracking_consent_user_id: 5,
      tracking_consent_at: new Date(Date.now() - 10000),
      ...overrides,
    };
    const query: any = {
      addSelect: () => query,
      setLock: jest.fn(() => query),
      where: () => query,
      getOne: async () => order,
    };
    const points = {
      findOne: jest.fn(async (options: any) => (options.where.sample_id ? null : last)),
      create: (v: unknown) => v,
      save: jest.fn(async (v: object) => ({ ...v, id: 1, created_at: new Date() })),
    };
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce({ createQueryBuilder: () => query })
        .mockReturnValue(points),
      findOne: async () => ({ id: 4, is_online: true }),
    };
    const gateway = { emitLocation: jest.fn(async () => {}) };
    const service = new UpdateDeliveryLocationUseCase(
      { manager: { transaction: async (fn: any) => fn(manager) } } as never,
      points as never,
      {
        getActiveDeliveryPerson: async () => ({ id: 4, is_online: true }),
        assertIsAssignedDeliveryPerson: () => {},
        assertDeliveryPersonCanServeUnit: async () => {},
      } as never,
      gateway as never,
    );
    return { service, points, gateway, query };
  }
  it('accepts native GPS floating-point accuracy without arbitrary decimal rejection', async () => {
    expect(await validate(dto())).toEqual([]);
  });
  it('rejects cancelled orders even if the delivery status was left active', async () => {
    const { service, points } = setup({ status: 'CANCELLED' });
    await expect(service.execute(1, dto(), { id: 5 } as never)).rejects.toThrow();
    expect(points.save).not.toHaveBeenCalled();
  });
  it('rejects missing/revoked consent', async () => {
    const { service, points } = setup({ tracking_revoked_at: new Date() });
    await expect(service.execute(1, dto(), { id: 5 } as never)).rejects.toThrow();
    expect(points.save).not.toHaveBeenCalled();
  });
  it('serializes accepted writes on the order and broadcasts only after commit', async () => {
    const { service, points, gateway, query } = setup();
    await service.execute(1, dto(), { id: 5 } as never);
    expect(query.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(points.save).toHaveBeenCalledTimes(1);
    expect(gateway.emitLocation).toHaveBeenCalledTimes(1);
  });
  it('rejects stale and mocked samples without saving', async () => {
    const { service, points } = setup();
    await expect(
      service.execute(1, { ...dto(), captured_at: new Date(Date.now() - 120000).toISOString() }, {
        id: 5,
      } as never),
    ).rejects.toThrow();
    await expect(
      service.execute(1, { ...dto(), is_mocked: true }, { id: 5 } as never),
    ).rejects.toThrow();
    expect(points.save).not.toHaveBeenCalled();
  });
  it('rejects out-of-order points', async () => {
    const { service } = setup(
      {},
      { created_at: new Date(Date.now() - 10000), captured_at: new Date(Date.now() + 5000) },
    );
    await expect(service.execute(1, dto(), { id: 5 } as never)).rejects.toThrow();
  });
  it('rejects implausible jumps', async () => {
    const { service } = setup(
      {},
      {
        created_at: new Date(Date.now() - 10000),
        captured_at: new Date(Date.now() - 10000),
        latitude: 0,
        longitude: 0,
        accuracy: 10,
      },
    );
    await expect(service.execute(1, dto(), { id: 5 } as never)).rejects.toThrow();
  });
});
