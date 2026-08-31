/* global beforeEach, jest */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { DeliveryCodeService } from './delivery-code.service';

describe('DeliveryCodeService', () => {
  const repository = {
    save: jest.fn(async (order: Order) => order),
  } as unknown as Repository<Order>;
  const config = {
    get: jest.fn((name: string, fallback?: string) =>
      name === 'DELIVERY_CODE_SECRET' ? 'test-delivery-secret' : fallback,
    ),
    getOrThrow: jest.fn(),
  } as unknown as ConfigService;
  const service = new DeliveryCodeService(config, repository);

  beforeEach(() => jest.clearAllMocks());

  function createOrder(id = 10): Order {
    return Object.assign(new Order(), {
      id,
      scheduled_delivery_date: null,
      pickup_code_attempts: 0,
      delivery_code_attempts: 0,
    });
  }

  it('issues a six digit pickup code and validates it once', async () => {
    const order = createOrder();
    const code = service.issue(order, 'PICKUP');

    expect(code).toMatch(/^\d{6}$/);
    expect(order.pickup_code_hash).not.toContain(code);
    await service.verify(order, 'PICKUP', code);
    expect(order.pickup_verified_at).toBeInstanceOf(Date);
    await expect(service.verify(order, 'PICKUP', code)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid code and counts the failed attempt', async () => {
    const order = createOrder();
    const code = service.issue(order, 'DELIVERY');
    const invalid = code === '000000' ? '000001' : '000000';

    await expect(service.verify(order, 'DELIVERY', invalid)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(order.delivery_code_attempts).toBe(1);
  });

  it('binds a code hash to its order', async () => {
    const first = createOrder(10);
    const second = createOrder(11);
    const code = service.issue(first, 'DELIVERY');
    second.delivery_code_hash = first.delivery_code_hash;
    second.delivery_code_expires_at = first.delivery_code_expires_at;

    await expect(service.verify(second, 'DELIVERY', code)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects expired codes', async () => {
    const order = createOrder();
    const code = service.issue(order, 'PICKUP');
    order.pickup_code_expires_at = new Date(Date.now() - 1);

    await expect(service.verify(order, 'PICKUP', code)).rejects.toBeInstanceOf(BadRequestException);
  });
});
