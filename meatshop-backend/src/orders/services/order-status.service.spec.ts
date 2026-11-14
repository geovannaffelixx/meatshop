import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { DeliveryType } from '../enums/delivery-type.enum';
import { DeliveryCodeService } from './delivery-code.service';
import { OrderStatusService } from './order-status.service';
import { OrderStatusHistory } from '../entities/order-status-history.entity';

function setup(mode: 'counter' | 'pickup' | 'delivery' = 'counter') {
  const order = Object.assign(new Order(), {
    id: 9,
    client_id: 1,
    unit_id: 2,
    status: mode === 'delivery' ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.READY,
    delivery_type: mode === 'counter' ? DeliveryType.PICKUP : DeliveryType.DELIVERY,
    payment_status: PaymentStatus.PAID,
    delivery_status: mode === 'pickup' ? 'PICKUP' : mode === 'delivery' ? 'ON_THE_WAY' : null,
    delivery_step: null,
    delivery_person_id: mode === 'counter' ? null : 5,
    delivery_code_attempts: 0,
    pickup_code_attempts: 0,
  });
  const secured = { save: jest.fn(async (value: Order) => value) };
  const query = {
    addSelect: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(async () => order),
  };
  const manager = {
    getRepository: () => ({ ...secured, createQueryBuilder: () => query }),
    findOne: async () => ({ method: 'Cash' }),
    save: jest.fn(async (_entity: unknown, value: unknown) => value),
    create: (_entity: unknown, value: unknown) => value,
  };
  const repository = {
    manager: {
      transaction: async (work: (m: typeof manager) => Promise<unknown>) => {
        const before = { ...order };
        try {
          return await work(manager);
        } catch (error) {
          Object.assign(order, before);
          throw error;
        }
      },
    },
  };
  const codes = new DeliveryCodeService(
    {
      get: (key: string, fallback?: string) =>
        key === 'DELIVERY_CODE_SECRET' ? 'counter-test-secret' : fallback,
    } as never,
    secured as never,
  );
  const notifyCustomerOfStatusChange = jest.fn(async () => undefined);
  const service = new OrderStatusService(
    repository as never,
    {} as never,
    { notifyCustomerOfStatusChange } as never,
    codes,
  );
  const code = codes.issue(order, mode === 'pickup' ? 'PICKUP' : 'DELIVERY');
  return {
    service,
    order,
    code,
    codes,
    manager,
    query,
    notifyCustomerOfStatusChange,
  };
}

describe('Counter pickup completion', () => {
  it('requires recorded payment without consuming the customer code', async () => {
    const { service, order, code, codes } = setup();
    order.payment_status = PaymentStatus.PENDING;
    await expect(
      service.transition(Object.assign(new Order(), order), OrderStatus.DELIVERED, 3, code),
    ).rejects.toMatchObject({ response: { code: 'PICKUP_PAYMENT_REQUIRED' } });
    expect(order.status).toBe(OrderStatus.READY);
    expect(codes.revealDeliveryCode(order)).toBe(code);
  });
  it('requires the customer code even for a paid order', async () => {
    const { service, order } = setup();
    await expect(
      service.transition(Object.assign(new Order(), order), OrderStatus.DELIVERED, 3),
    ).rejects.toMatchObject({ response: { code: 'PICKUP_CODE_REQUIRED' } });
    expect(order.delivery_verified_at).toBeNull();
  });
  it('retains invalid-code attempt counters while leaving the order ready', async () => {
    const { service, order, code, notifyCustomerOfStatusChange } = setup();
    await expect(
      service.transition(
        Object.assign(new Order(), order),
        OrderStatus.DELIVERED,
        3,
        code === '000000' ? '000001' : '000000',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(order.delivery_code_attempts).toBe(1);
    expect(order.status).toBe(OrderStatus.READY);
    expect(order.delivery_verified_at).toBeNull();
    expect(notifyCustomerOfStatusChange).not.toHaveBeenCalled();
  });
  it('completes pickup once, saves its audit history and never assigns a courier', async () => {
    const { service, order, code, manager, codes, query } = setup();
    const snapshot = Object.assign(new Order(), order);
    await expect(
      service.transition(snapshot, OrderStatus.DELIVERED, 3, code),
    ).resolves.toMatchObject({
      status: OrderStatus.DELIVERED,
      delivery_person_id: null,
      delivery_status: null,
    });
    expect(query.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(order.delivery_verified_at).toBeInstanceOf(Date);
    expect(manager.save).toHaveBeenCalledWith(
      OrderStatusHistory,
      expect.objectContaining({ status: OrderStatus.DELIVERED, updated_by: 3 }),
    );
    expect(codes.revealDeliveryCode(order)).toBeNull();
    await expect(
      service.transition(snapshot, OrderStatus.DELIVERED, 3, code),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('rolls code consumption back if saving the completion fails, allowing a safe retry', async () => {
    const { service, order, code, manager, codes } = setup();
    manager.save.mockRejectedValueOnce(new Error('Database temporarily unavailable'));
    await expect(
      service.transition(Object.assign(new Order(), order), OrderStatus.DELIVERED, 3, code),
    ).rejects.toThrow('Database temporarily unavailable');
    expect(codes.revealDeliveryCode(order)).toBe(code);
    expect(order.status).toBe(OrderStatus.READY);
    await expect(
      service.transition(Object.assign(new Order(), order), OrderStatus.DELIVERED, 3, code),
    ).resolves.toMatchObject({ status: OrderStatus.DELIVERED });
  });
  it('does not complete a pickup that is still being prepared', async () => {
    const { service, order, code } = setup();
    order.status = OrderStatus.PREPARING;
    await expect(
      service.transition(Object.assign(new Order(), order), OrderStatus.DELIVERED, 3, code),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe.each(['pickup', 'delivery'] as const)('Atomic normal delivery: %s', (mode) => {
  it('rolls code verification back after persistence failure, then permits a single successful retry', async () => {
    const { service, order, code, manager } = setup(mode);
    const target = mode === 'pickup' ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.DELIVERED;
    const before = Object.assign(new Order(), order);
    manager.save.mockRejectedValueOnce(new Error('save failed'));
    await expect(service.transition(before, target, 3, code)).rejects.toThrow('save failed');
    expect(mode === 'pickup' ? order.pickup_verified_at : order.delivery_verified_at).toBeNull();
    expect(order.status).toBe(before.status);
    await service.transition(before, target, 3, code);
    expect(order.status).toBe(target);
    expect(order.delivery_status).toBe(mode === 'pickup' ? 'ON_THE_WAY' : 'DELIVERED');
    await expect(service.transition(before, target, 3, code)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('retains invalid attempt counters without advancing the order', async () => {
    const { service, order, code } = setup(mode);
    const target = mode === 'pickup' ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.DELIVERED;
    const before = order.status;
    await expect(
      service.transition(
        Object.assign(new Order(), order),
        target,
        3,
        code === '000000' ? '000001' : '000000',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(order.status).toBe(before);
    expect(mode === 'pickup' ? order.pickup_code_attempts : order.delivery_code_attempts).toBe(1);
  });
});
