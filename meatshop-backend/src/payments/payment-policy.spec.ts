import { BadRequestException } from '@nestjs/common';
import { assertPaymentAllowsPreparation, cents, isOfflinePayment } from './payment-policy';
import { PaymentStatus as Status } from '../orders/enums/payment-status.enum';
import { PaymentMethod as Method } from '../orders/enums/payment-method.enum';
import { MercadoPagoService } from './providers/mercadopago.service';
import { ConfigService } from '@nestjs/config';

describe('Payment policy', () => {
  it.each([Method.PIX, Method.CREDIT, Method.DEBIT, null])(
    'blocks unpaid online/unknown method %s',
    (method) => {
      expect(() => assertPaymentAllowsPreparation(Status.PENDING, method)).toThrow(
        BadRequestException,
      );
    },
  );
  it.each([Status.REJECTED, Status.REFUNDED, Status.CHARGED_BACK, Status.CANCELLED])(
    'blocks %s even for cash',
    (status) => {
      expect(() => assertPaymentAllowsPreparation(status, Method.CASH)).toThrow();
    },
  );
  it('allows explicit payment on delivery without falsely marking it paid', () => {
    expect(isOfflinePayment(Method.CARD_ON_DELIVERY)).toBe(true);
    expect(() => assertPaymentAllowsPreparation(Status.PENDING, Method.CASH)).not.toThrow();
    expect(() => assertPaymentAllowsPreparation(Status.PAID, Method.PIX)).not.toThrow();
  });
  it('compares monetary values in cents', () => {
    expect(cents(0.1 + 0.2)).toBe(30);
  });
  it('maps Pix from the method identifier and does not misclassify every bank transfer', () => {
    const mp = new MercadoPagoService(new ConfigService());
    expect(mp.mapPaymentMethod('bank_transfer', 'pix')).toBe(Method.PIX);
    expect(mp.mapPaymentMethod('bank_transfer', 'pse')).toBeUndefined();
    expect(mp.enabled).toBe(false);
  });
});
