import { jest } from '@jest/globals';
import { DeliveryGateway } from './delivery.gateway';
import type { User } from '../users/entities/user.entity';
import type { Order } from '../orders/entities/order.entity';
import type { DeliveryTracking } from './entities/delivery-tracking.entity';
describe('DeliveryGateway live authorization', () => {
  const order = {
    id: 1,
    unit_id: 2,
    client_id: 3,
    delivery_person_id: 4,
    status: 'READY',
    delivery_status: 'PICKUP',
    tracking_consent_at: new Date(Date.now() - 1000),
    tracking_revoked_at: null,
  } as Order;
  const point = {
    id: 1,
    order_id: 1,
    delivery_person_id: 4,
    latitude: -23,
    longitude: -46,
    accuracy: 10,
    created_at: new Date(),
    captured_at: new Date(),
  } as DeliveryTracking;
  function setup(user: Partial<User> = { id: 3, is_active: true }) {
    const users = { findOne: jest.fn(async () => user) };
    const orders = { findOne: jest.fn(async () => order) };
    const permissions = {
      assertHasPermission: jest.fn(async () => {
        throw new Error('revoked');
      }),
    };
    const client = {
      id: 'socket',
      data: { user: { id: 3 }, expiresAt: Date.now() + 60000 },
      emit: jest.fn(),
      leave: jest.fn(async () => {}),
      disconnect: jest.fn(),
    };
    const gateway = new DeliveryGateway(
      {} as never,
      users as never,
      orders as never,
      {
        findOne: async (options: { where: { id?: number } }) =>
          options.where.id ? { id: 4, is_online: true, status: 'ACTIVE' } : null,
      } as never,
      permissions as never,
    );
    gateway.server = { in: () => ({ fetchSockets: async () => [client] }) } as never;
    return { gateway, client, users, orders, permissions };
  }
  it('rechecks the account before every location broadcast', async () => {
    const { gateway, client, users } = setup();
    await gateway.emitLocation(order, point);
    expect(client.emit).toHaveBeenCalledWith(
      'delivery:location.updated',
      expect.objectContaining({ accuracy: 10 }),
    );
    client.emit.mockClear();
    users.findOne.mockResolvedValue({ id: 3, is_active: false });
    await gateway.emitLocation(order, point);
    expect(client.emit).not.toHaveBeenCalledWith('delivery:location.updated', expect.anything());
    expect(client.leave).toHaveBeenCalledWith('order:1');
  });
  it('removes a formerly authorized employee after permission revocation', async () => {
    const { gateway, client } = setup({ id: 8, is_active: true });
    await gateway.emitLocation(order, point);
    expect(client.emit).toHaveBeenCalledWith('delivery:access.revoked', { orderId: 1 });
    expect(client.leave).toHaveBeenCalledWith('unit:2');
  });
  it('disconnects expired sessions without sending coordinates', async () => {
    const { gateway, client } = setup();
    client.data.expiresAt = Date.now() - 1;
    await gateway.emitLocation(order, point);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.emit).not.toHaveBeenCalled();
  });
  it('does not emit a persisted sample after cancellation or reassigning the courier', async () => {
    const { gateway, client, orders } = setup();
    orders.findOne.mockResolvedValue({ ...order, status: 'CANCELLED' } as Order);
    await gateway.emitLocation(order, point);
    expect(client.emit).not.toHaveBeenCalled();
    orders.findOne.mockResolvedValue({ ...order, delivery_person_id: 5 } as Order);
    await gateway.emitLocation(order, point);
    expect(client.emit).not.toHaveBeenCalled();
  });
  it('expires an idle socket even without broadcasts', async () => {
    jest.useFakeTimers();
    const gateway = new DeliveryGateway(
      { verifyAsync: async () => ({ sub: 3, exp: Math.floor(Date.now() / 1000) + 2 }) } as never,
      { findOne: async () => ({ id: 3, is_active: true }) } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const client = {
      id: 'idle',
      data: {},
      handshake: { auth: { token: 'test' } },
      disconnect: jest.fn(),
    };
    try {
      await gateway.handleConnection(client as never);
      jest.advanceTimersByTime(3000);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    } finally {
      gateway.onModuleDestroy();
      jest.useRealTimers();
    }
  });
});
