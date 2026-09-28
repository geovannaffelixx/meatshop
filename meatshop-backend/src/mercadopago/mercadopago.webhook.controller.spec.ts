/* global jest, beforeEach */
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { MercadoPagoWebhookController } from './mercadopago.webhook.controller';
import type { PaymentLifecycleService } from '../payments/payment-lifecycle.service';

describe('Mercado Pago webhook authentication and retries', () => {
  const process = jest.fn();
  const controller = new MercadoPagoWebhookController(
    { process } as unknown as PaymentLifecycleService,
    new ConfigService({ MP_WEBHOOK_SECRET: 'test-secret' }),
  );
  const signature = (ts = String(Math.floor(Date.now() / 1000)), id = '123') =>
    `ts=${ts},v1=${createHmac('sha256', 'test-secret').update(`id:${id};request-id:request;ts:${ts};`).digest('hex')}`;
  beforeEach(() => process.mockReset());

  it('uses the signed query payment id and the designated seller', async () => {
    await controller.handle(
      { data: { id: '456' } },
      { 'data.id': '123', unit_id: '7' },
      signature(),
      'request',
    );
    expect(process).toHaveBeenCalledWith('123', 7);
  });
  it.each([undefined, 'ts=1,v1=invalid', signature('1'), signature(undefined, '999')])(
    'rejects missing, old or altered signatures',
    async (value) => {
      await expect(
        controller.handle({}, { 'data.id': '123', unit_id: '7' }, value, 'request'),
      ).rejects.toThrow();
      expect(process).not.toHaveBeenCalled();
    },
  );
  it('rejects a missing seller', async () => {
    await expect(
      controller.handle({}, { 'data.id': '123' }, signature(), 'request'),
    ).rejects.toThrow();
    expect(process).not.toHaveBeenCalled();
  });
  it('does not acknowledge provider or database failures as successful delivery', async () => {
    process.mockRejectedValueOnce(new Error('Provider unavailable'));
    await expect(
      controller.handle({}, { 'data.id': '123', unit_id: '7' }, signature(), 'request'),
    ).rejects.toThrow('Provider unavailable');
  });
});
