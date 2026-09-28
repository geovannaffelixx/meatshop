import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '../orders/enums/payment-method.enum';
import { PaymentStatus } from '../orders/enums/payment-status.enum';

export const isOfflinePayment = (method: PaymentMethod | null | undefined): boolean =>
  method === PaymentMethod.CASH || method === PaymentMethod.CARD_ON_DELIVERY;
export const cents = (value: number | string): number => Math.round(Number(value) * 100);
export function assertPaymentAllowsPreparation(
  status: PaymentStatus,
  method: PaymentMethod | null | undefined,
): void {
  if (
    status !== PaymentStatus.PAID &&
    !(status === PaymentStatus.PENDING && isOfflinePayment(method))
  ) {
    throw new BadRequestException({
      code: 'PAYMENT_REQUIRED',
      message: 'Payment approval is required before preparing this order.',
    });
  }
}
