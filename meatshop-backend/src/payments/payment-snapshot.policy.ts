import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { PaymentStatus } from '../orders/enums/payment-status.enum';
import type { Order } from '../orders/entities/order.entity';
import type { Payment } from '../orders/entities/payment.entity';
import type { MercadoPagoPaymentSnapshot } from './providers/mercadopago.service';
import { cents } from './payment-policy';

export const CAPTURED_PAYMENT_STATUSES = [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED];
export const SETTLED_PAYMENT_STATUSES = [
  PaymentStatus.PAID,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
  PaymentStatus.CHARGED_BACK,
];
export const OPEN_PAYMENT_STATUSES = [
  PaymentStatus.PENDING,
  PaymentStatus.REJECTED,
  PaymentStatus.CANCELLED,
];

const PAYMENT_REFERENCE_PATTERN = /^(\d+|[0-9a-f-]{36})$/i;
const SUPPORTED_CURRENCY = 'BRL';

export type KnownRefund = { order_id: number; amount: number | string };

export const isPaymentReference = (reference: string | null | undefined): reference is string =>
  !!reference && PAYMENT_REFERENCE_PATTERN.test(reference);

export const isPayableOrder = (order: Order, now = new Date()): boolean =>
  order.status === OrderStatus.PENDING &&
  OPEN_PAYMENT_STATUSES.includes(order.payment_status) &&
  !!order.payment_due_at &&
  order.payment_due_at > now;

const amountsMatch = (snapshot: MercadoPagoPaymentSnapshot, totalCents: number): boolean =>
  snapshot.currencyId === SUPPORTED_CURRENCY &&
  snapshot.transactionAmount != null &&
  Number.isFinite(snapshot.transactionAmount) &&
  cents(snapshot.transactionAmount) === totalCents &&
  Number.isFinite(snapshot.refundedAmount) &&
  snapshot.refundedAmount >= 0 &&
  cents(snapshot.refundedAmount) <= totalCents &&
  Number.isFinite(snapshot.feeAmount) &&
  snapshot.feeAmount >= 0;

export function assertSnapshotMatchesCheckout(
  snapshot: MercadoPagoPaymentSnapshot,
  totalCents: number,
): void {
  if (!amountsMatch(snapshot, totalCents))
    throw new BadRequestException('Payment amount or currency does not match checkout');
  if (
    snapshot.status === 'approved' &&
    (!snapshot.approvedAt || !Number.isFinite(snapshot.approvedAt.getTime()))
  )
    throw new BadRequestException('Approved payment is missing its approval date');
}

export function mapSnapshotStatus(snapshot: MercadoPagoPaymentSnapshot): PaymentStatus {
  switch (snapshot.status) {
    case 'approved':
      return PaymentStatus.PAID;
    case 'refunded':
      return PaymentStatus.REFUNDED;
    case 'charged_back':
      return PaymentStatus.CHARGED_BACK;
    case 'rejected':
      return PaymentStatus.REJECTED;
    case 'cancelled':
      return PaymentStatus.CANCELLED;
    default:
      return PaymentStatus.PENDING;
  }
}

export const hasOtherSettledCharge = (payments: Payment[], paymentId: string): boolean =>
  payments.some(
    (p) =>
      !!p.transaction_id &&
      p.transaction_id !== paymentId &&
      SETTLED_PAYMENT_STATUSES.includes(p.status),
  );

export const isSupersededPayment = (
  payment: Payment,
  paymentId: string,
  incoming: PaymentStatus,
): boolean =>
  (!!payment.transaction_id &&
    payment.transaction_id !== paymentId &&
    !OPEN_PAYMENT_STATUSES.includes(payment.status)) ||
  (SETTLED_PAYMENT_STATUSES.includes(payment.status) && OPEN_PAYMENT_STATUSES.includes(incoming));

export function allocateRefundCents(
  orders: Order[],
  knownRefunds: KnownRefund[],
  refundedCents: number,
): Map<number, number> {
  let remaining = refundedCents;
  const allocated = new Map<number, number>();
  for (const order of orders) {
    const known = Math.min(
      cents(order.total_amount),
      cents(knownRefunds.find((r) => r.order_id === order.id)?.amount ?? 0),
      remaining,
    );
    allocated.set(order.id, known);
    remaining -= known;
  }
  for (const order of orders) {
    const extra = Math.min(cents(order.total_amount) - allocated.get(order.id)!, remaining);
    allocated.set(order.id, allocated.get(order.id)! + extra);
    remaining -= extra;
  }
  return allocated;
}

export function feeShareCents(params: {
  isLast: boolean;
  remainingFeeCents: number;
  feeCents: number;
  orderCents: number;
  totalCents: number;
}): number {
  if (params.isLast) return params.remainingFeeCents;
  return Math.min(
    params.remainingFeeCents,
    Math.round((params.feeCents * params.orderCents) / params.totalCents),
  );
}

export function resolvePaymentStatus(
  incoming: PaymentStatus,
  refundedAmount: number,
  orderTotal: number,
): PaymentStatus {
  if (incoming === PaymentStatus.CHARGED_BACK) return incoming;
  if (refundedAmount >= orderTotal) return PaymentStatus.REFUNDED;
  if (refundedAmount > 0) return PaymentStatus.PARTIALLY_REFUNDED;
  return incoming;
}

export const isLateCapture = (order: Order, approvedAt: Date | null): boolean =>
  order.status === OrderStatus.CANCELLED ||
  (order.status === OrderStatus.PENDING &&
    !!order.payment_due_at &&
    (approvedAt ?? new Date()) > order.payment_due_at);
