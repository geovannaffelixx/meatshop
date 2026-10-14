/* global jest, beforeEach */
import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Order } from '../orders/entities/order.entity';
import type { PaymentLifecycleService } from '../payments/payment-lifecycle.service';
import type { SellerAccountsService } from '../payments/seller-accounts.service';
import { MercadoPagoController } from './mercadopago.controller';

describe('Mercado Pago capabilities query validation', () => {
  const availability = jest.fn(async (ids: number[]) =>
    ids.map((unit_id) => ({ unit_id, online: false })),
  );
  const controller = new MercadoPagoController(
    {} as Repository<Order>,
    {} as PaymentLifecycleService,
    { enabled: false, availability } as unknown as SellerAccountsService,
  );

  beforeEach(() => availability.mockClear());

  it.each([{ value: ['1', '2'] }, { value: { unit: '1' } }, { value: 1 }, { value: true }])(
    'rejects non-string query values before coercion or seller lookup: %p',
    async ({ value }) => {
      await expect(controller.capabilities(value)).rejects.toBeInstanceOf(BadRequestException);
      expect(availability).not.toHaveBeenCalled();
    },
  );

  it.each(['', '0', '-1', '1,abc', '1,,2', '9'.repeat(301), '9007199254740992'])(
    'rejects invalid string query values: %p',
    async (value) => {
      await expect(controller.capabilities(value)).rejects.toBeInstanceOf(BadRequestException);
      expect(availability).not.toHaveBeenCalled();
    },
  );

  it('accepts a valid list and deduplicates unit IDs', async () => {
    const result = await controller.capabilities('1,2,1');
    expect(availability).toHaveBeenCalledWith([1, 2]);
    expect(result.units).toEqual([
      { unit_id: 1, online: false },
      { unit_id: 2, online: false },
    ]);
  });

  it('accepts a request without unit IDs', async () => {
    await controller.capabilities();
    expect(availability).toHaveBeenCalledWith([]);
  });

  it('rejects more than twenty distinct units', async () => {
    await expect(
      controller.capabilities(Array.from({ length: 21 }, (_, i) => i + 1).join(',')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(availability).not.toHaveBeenCalled();
  });
});
