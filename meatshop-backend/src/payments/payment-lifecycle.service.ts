import { SendOrderStatusNotificationUseCase } from '../notifications/use-cases/send-order-status-notification.use-case';
import { SellerAccountsService } from './seller-accounts.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { DataSource, EntityManager, QueryFailedError, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../orders/entities/payment.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatusHistory } from '../orders/entities/order-status-history.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { PaymentStatus } from '../orders/enums/payment-status.enum';
import { CancelledBy } from '../orders/enums/cancelled-by.enum';
import { Stock } from '../products/entities/stock.entity';
import { CouponRedemptionService } from '../promotions/services/coupon-redemption.service';
import { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import { UnitPermission } from '../common/enums/unit-permission.enum';
import { User } from '../users/entities/user.entity';
import { MercadoPagoPaymentSnapshot, MercadoPagoService } from './providers/mercadopago.service';
import { cents, isOfflinePayment } from './payment-policy';
import {
  CAPTURED_PAYMENT_STATUSES,
  OPEN_PAYMENT_STATUSES,
  allocateRefundCents,
  assertSnapshotMatchesCheckout,
  feeShareCents,
  hasOtherSettledCharge,
  isLateCapture,
  isPayableOrder,
  isPaymentReference,
  isSupersededPayment,
  mapSnapshotStatus,
  resolvePaymentStatus,
} from './payment-snapshot.policy';
import { normalizeMonthRange } from '../finance/utils/month-range.util';
import { MetricsService } from '../metrics/metrics.service';

const MAINTENANCE_INTERVAL_MS = 30_000;
const MAINTENANCE_LOCK = 'meatshop:payment-maintenance';
const PAGE_SIZE = 20;
const MAX_PAGE = 10_000;
const BATCH_SIZE = 20;
const EXPIRATION_BATCH_SIZE = 50;

type SnapshotContext = {
  manager: EntityManager;
  mp: MercadoPagoService;
  paymentId: string;
  unitId: number;
  snapshot: MercadoPagoPaymentSnapshot;
  reference: string;
};

type SettlementPlan = {
  orders: Order[];
  payments: Payment[];
  status: PaymentStatus;
  allocated: Map<number, number>;
  total: number;
};

type ChargeUpdate = { status: PaymentStatus; refundedCents: number; feeCents: number };

type RefundRow = {
  id: string;
  payment_id: string;
  order_id: number | null;
  unit_id: number;
  status: string;
  provider_id: string | null;
  attempt_key: string;
  requested_by: number | null;
  retry_requested_by: number | null;
};

type RefundRetry = { state: string; providerId: string | null; key: string };

type CompletedRefund = { paymentId: string; unitId: number };

@Injectable()
export class PaymentLifecycleService {
  private readonly logger = new Logger(PaymentLifecycleService.name);
  private working = false;
  private expiring = false;

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly sellers: SellerAccountsService,
    private readonly units: UnitAuthorizationService,
    private readonly coupons: CouponRedemptionService,
    private readonly notifications: SendOrderStatusNotificationUseCase,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  private async lockReference(manager: EntityManager, reference: string): Promise<Order[]> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`payment:${reference}`]);
    return manager
      .getRepository(Order)
      .createQueryBuilder('o')
      .setLock('pessimistic_write')
      .where(/^\d+$/.test(reference) ? 'o.id = :id' : 'o.checkout_id = :id', { id: reference })
      .orderBy('o.id', 'ASC')
      .getMany();
  }

  async checkout(reference: string, user: User) {
    if (!this.sellers.enabled)
      throw new ServiceUnavailableException({
        code: 'PAYMENTS_DISABLED',
        message: 'Online payments are currently unavailable.',
      });
    const candidates = await this.db.getRepository(Order).find({
      where: {
        client_id: user.id,
        ...(/^\d+$/.test(reference) ? { id: Number(reference) } : { checkout_id: reference }),
      },
    });
    if (!candidates.length) throw new NotFoundException('Checkout not found');
    if (candidates.length !== 1) throw new BadRequestException('Pay each butcher separately');
    const mp = await this.sellers.forUnit(candidates[0].unit_id, true);
    return this.db.transaction((manager) => this.prepareCheckout(manager, mp, reference, user));
  }

  private async prepareCheckout(
    manager: EntityManager,
    mp: MercadoPagoService,
    reference: string,
    user: User,
  ) {
    const orders = await this.lockReference(manager, reference);
    if (!orders.length) throw new NotFoundException('Checkout not found');
    if (orders.length !== 1) throw new BadRequestException('Pay each butcher separately');
    if (orders.some((o) => o.client_id !== user.id))
      throw new ForbiddenException('Checkout does not belong to current user');
    if (orders.some((o) => !isPayableOrder(o)))
      throw new BadRequestException({
        code: 'CHECKOUT_NOT_PAYABLE',
        message: 'This checkout is paid, expired or no longer pending.',
      });
    const payments = await this.loadOnlinePayments(manager, orders);
    const existing = payments.find((p) => p.mp_checkout_url);
    if (existing) return { checkoutId: reference, checkoutUrl: existing.mp_checkout_url };
    const preference = await mp.createCheckoutPreference({
      checkoutId: String(orders[0].id),
      expiresAt: new Date(Math.min(...orders.map((o) => o.payment_due_at!.getTime()))),
      method: payments[0].method,
      items: orders.map((o) => ({
        orderId: o.id,
        amount: Number(o.total_amount),
        description: `Meatshop #${o.id}`,
      })),
    });
    for (const p of payments) {
      p.mp_preference_id = preference.preferenceId;
      p.mp_checkout_url = preference.checkoutUrl;
      p.payment_reference = String(orders[0].id);
      await manager.save(Payment, p);
    }
    return { checkoutId: reference, ...preference };
  }

  private async loadOnlinePayments(manager: EntityManager, orders: Order[]): Promise<Payment[]> {
    const payments = await manager
      .getRepository(Payment)
      .createQueryBuilder('p')
      .addSelect('p.mp_checkout_url')
      .where('p.order_id IN (:...ids)', { ids: orders.map((o) => o.id) })
      .getMany();
    if (payments.length !== orders.length || payments.some((p) => isOfflinePayment(p.method)))
      throw new BadRequestException('This order does not use online payment');
    return payments;
  }

  async process(paymentId: string, unitId: number): Promise<void> {
    const mp = await this.sellers.forUnit(unitId);
    const snapshot = await mp.getPaymentSnapshot(paymentId);
    const reference = snapshot.externalReference;
    if (!isPaymentReference(reference)) return;
    await this.db.transaction((manager) =>
      this.applySnapshot({ manager, mp, paymentId, unitId, snapshot, reference }),
    );
  }

  private async applySnapshot(context: SnapshotContext): Promise<void> {
    const { manager, paymentId, unitId, snapshot } = context;
    const orders = await this.lockReference(manager, context.reference);
    if (!orders.length) return;
    if (orders.length !== 1 || orders[0].unit_id !== unitId)
      throw new BadRequestException('Payment seller mismatch');
    const total = orders.reduce((sum, o) => sum + cents(o.total_amount), 0);
    assertSnapshotMatchesCheckout(snapshot, total);
    if (!(await this.recordTransaction(context, total))) return;
    const payments = await this.lockPayments(manager, orders);
    const status = mapSnapshotStatus(snapshot);
    if (status === PaymentStatus.PAID && hasOtherSettledCharge(payments, paymentId)) {
      await this.queueRefund(
        manager,
        paymentId,
        null,
        Number(snapshot.transactionAmount),
        'Duplicate payment',
        null,
        unitId,
      );
      return;
    }
    const allocated = await this.loadRefundAllocation(context, orders);
    await this.applyToOrders(context, { orders, payments, status, allocated, total });
  }

  private async recordTransaction(context: SnapshotContext, total: number): Promise<boolean> {
    const { manager, paymentId, unitId, snapshot, reference } = context;
    const [previous] = await manager.query(
      'SELECT * FROM payment_transactions WHERE id = $1 FOR UPDATE',
      [paymentId],
    );
    if (previous && (previous.reference !== reference || previous.unit_id !== unitId))
      throw new BadRequestException('Payment reference or seller changed after registration');
    if (
      previous?.provider_updated_at &&
      snapshot.updatedAt &&
      new Date(previous.provider_updated_at) > snapshot.updatedAt
    )
      return false;
    await manager.query(
      `INSERT INTO payment_transactions(id, reference, status, amount, refunded_amount, provider_updated_at,unit_id)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status, refunded_amount=EXCLUDED.refunded_amount,
        provider_updated_at=EXCLUDED.provider_updated_at, updated_at=now()`,
      [
        paymentId,
        reference,
        snapshot.status ?? 'unknown',
        snapshot.transactionAmount,
        snapshot.refundedAmount,
        snapshot.updatedAt,
        unitId,
      ],
    );
    if (cents(snapshot.refundedAmount) === total)
      await manager.query(
        "UPDATE payment_refunds SET status='COMPLETED',last_error=NULL,updated_at=now() WHERE payment_id=$1 AND status<>'COMPLETED'",
        [paymentId],
      );
    return true;
  }

  private lockPayments(manager: EntityManager, orders: Order[]): Promise<Payment[]> {
    return manager
      .getRepository(Payment)
      .createQueryBuilder('p')
      .setLock('pessimistic_write')
      .where('p.order_id IN (:...ids)', { ids: orders.map((o) => o.id) })
      .getMany();
  }

  private async loadRefundAllocation(
    context: SnapshotContext,
    orders: Order[],
  ): Promise<Map<number, number>> {
    const refunds = await context.manager.query(
      "SELECT order_id, SUM(amount)::numeric AS amount FROM payment_refunds WHERE payment_id=$1 AND status='COMPLETED' GROUP BY order_id",
      [context.paymentId],
    );
    return allocateRefundCents(orders, refunds, cents(context.snapshot.refundedAmount));
  }

  private async applyToOrders(context: SnapshotContext, plan: SettlementPlan): Promise<void> {
    const byOrder = new Map(plan.payments.map((p) => [p.order_id, p]));
    const feeCents = cents(context.snapshot.feeAmount);
    let remainingFeeCents = feeCents;
    for (const [index, order] of plan.orders.entries()) {
      const payment = byOrder.get(order.id);
      if (!payment) throw new BadRequestException('Payment record missing');
      if (isSupersededPayment(payment, context.paymentId, plan.status)) continue;
      const fee = feeShareCents({
        isLast: index === plan.orders.length - 1,
        remainingFeeCents,
        feeCents,
        orderCents: cents(order.total_amount),
        totalCents: plan.total,
      });
      remainingFeeCents -= fee;
      await this.applyToOrder(context, order, payment, {
        status: plan.status,
        refundedCents: plan.allocated.get(order.id)!,
        feeCents: fee,
      });
    }
  }

  private async applyToOrder(
    context: SnapshotContext,
    order: Order,
    payment: Payment,
    charge: ChargeUpdate,
  ): Promise<void> {
    const { manager } = context;
    const oldStatus = payment.status;
    this.updatePaymentFromSnapshot(context, order, payment, charge);
    order.payment_status = payment.status;
    if (CAPTURED_PAYMENT_STATUSES.includes(payment.status))
      await this.settleCapturedOrder(context, order, payment);
    await manager.save(Payment, payment);
    await manager.save(Order, order);
    if (oldStatus !== payment.status)
      await this.queueCustomerNotification(manager, order.id, `PAYMENT_${payment.status}`);
  }

  private updatePaymentFromSnapshot(
    context: SnapshotContext,
    order: Order,
    payment: Payment,
    charge: ChargeUpdate,
  ): void {
    const { snapshot } = context;
    payment.transaction_id = context.paymentId;
    payment.payment_reference = snapshot.externalReference;
    payment.mp_status_detail = snapshot.statusDetail;
    payment.mp_last_event_at = new Date();
    payment.method =
      context.mp.mapPaymentMethod(snapshot.paymentTypeId, snapshot.paymentMethodId) ??
      payment.method;
    payment.refunded_amount = charge.refundedCents / 100;
    payment.fee_amount = charge.feeCents / 100;
    payment.status = resolvePaymentStatus(
      charge.status,
      payment.refunded_amount,
      Number(order.total_amount),
    );
    if (snapshot.approvedAt) payment.payment_date = snapshot.approvedAt;
    if (payment.status === PaymentStatus.REFUNDED) payment.refund_status = 'COMPLETED';
  }

  private async settleCapturedOrder(
    context: SnapshotContext,
    order: Order,
    payment: Payment,
  ): Promise<void> {
    const { manager } = context;
    if (isLateCapture(order, context.snapshot.approvedAt)) {
      if (order.status !== OrderStatus.CANCELLED) await this.expire(manager, order);
      payment.refund_status = await this.queueRefund(
        manager,
        context.paymentId,
        order.id,
        Number(order.total_amount) - Number(payment.refunded_amount),
        'Cancelled or expired order',
        null,
        context.unitId,
      );
      return;
    }
    if (order.status !== OrderStatus.PENDING) return;
    order.status = OrderStatus.CONFIRMED;
    await this.queueCustomerNotification(manager, order.id, order.status);
    await this.recordStatusHistory(manager, order);
  }

  private async queueCustomerNotification(
    manager: EntityManager,
    orderId: number,
    status: string,
  ): Promise<void> {
    await manager.query(
      'INSERT INTO payment_notifications(order_id,status) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [orderId, status],
    );
  }

  private async recordStatusHistory(manager: EntityManager, order: Order): Promise<void> {
    await manager.save(
      OrderStatusHistory,
      manager.create(OrderStatusHistory, {
        order_id: order.id,
        status: order.status,
        updated_by: null,
      }),
    );
  }

  async resolveSeller(paymentId: string, collectorId: string): Promise<number> {
    const accounts: { unit_id: number }[] = await this.db.query(
      'SELECT unit_id FROM payment_sellers WHERE collector_id=$1 ORDER BY unit_id',
      [collectorId],
    );
    if (!accounts.length) throw new BadRequestException('Unknown seller');
    const snapshot = await (
      await this.sellers.forUnit(accounts[0].unit_id)
    ).getPaymentSnapshot(paymentId);
    const reference = snapshot.externalReference;
    if (!isPaymentReference(reference)) throw new BadRequestException('Unknown payment reference');
    const orders = await this.db.getRepository(Order).find({
      where: /^\d+$/.test(reference) ? { id: Number(reference) } : { checkout_id: reference },
    });
    if (orders.length !== 1 || !accounts.some((a) => a.unit_id === orders[0].unit_id))
      throw new BadRequestException('Payment seller mismatch');
    return orders[0].unit_id;
  }

  async queueRefund(
    manager: EntityManager,
    paymentId: string,
    orderId: number | null,
    amount: number,
    reason: string,
    actor: number | null,
    unitId: number,
  ) {
    if (cents(amount) <= 0) return 'COMPLETED';
    const inserted = await manager.query(
      `INSERT INTO payment_refunds(id,attempt_key,payment_id,order_id,amount,reason,requested_by,unit_id) VALUES($1,$1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING status`,
      [randomUUID(), paymentId, orderId, amount, reason, actor, unitId],
    );
    if (inserted[0]) return inserted[0].status as string;
    const [existing] = await manager.query(
      'SELECT status FROM payment_refunds WHERE payment_id=$1 AND order_id IS NOT DISTINCT FROM $2',
      [paymentId, orderId],
    );
    return existing.status as string;
  }

  async requestRefund(orderId: number, user: User, reason: string) {
    const order = await this.db.getRepository(Order).findOneByOrFail({ id: orderId });
    await this.units.assertHasPermission(user, order.unit_id, UnitPermission.MANAGE_FINANCE);
    return this.db.transaction(async (manager) => {
      const current = await manager.findOneOrFail(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      const p = await manager.findOneOrFail(Payment, {
        where: { order_id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (![OrderStatus.CANCELLED, OrderStatus.DELIVERED].includes(current.status))
        throw new BadRequestException('Cancel the order before requesting its refund');
      if (
        isOfflinePayment(p.method) ||
        !p.transaction_id ||
        !CAPTURED_PAYMENT_STATUSES.includes(p.status)
      )
        throw new BadRequestException('No refundable online payment');
      p.refund_status = await this.queueRefund(
        manager,
        p.transaction_id,
        orderId,
        Number(current.total_amount) - Number(p.refunded_amount),
        reason,
        user.id,
        current.unit_id,
      );
      await manager.save(p);
      return { status: p.refund_status };
    });
  }

  async list(unitId: number, user: User, page: number, view = 'all', month?: string) {
    await this.units.assertHasPermission(user, unitId, UnitPermission.VIEW_FINANCE);
    if (!Number.isSafeInteger(page) || page < 0 || page > MAX_PAGE)
      throw new BadRequestException('Invalid page');
    const conditions: Record<string, string> = {
      all: 'true',
      pending: "p.status IN ('PENDING','REJECTED') AND o.status<>'CANCELLED'",
      receivable:
        "p.status='PENDING' AND p.method IN ('Cash','Card on Delivery') AND o.status<>'CANCELLED'",
      refunds:
        "EXISTS(SELECT 1 FROM payment_refunds r WHERE r.unit_id=o.unit_id AND (r.order_id=o.id OR r.payment_id IN (SELECT t.id FROM payment_transactions t WHERE t.unit_id=o.unit_id AND t.reference IN (o.id::text,o.checkout_id::text))) AND r.status IN ('PENDING','FAILED'))",
      issues: "p.status='CHARGED_BACK' OR p.refund_status='FAILED'",
    };
    if (!(view in conditions)) throw new BadRequestException('Invalid payment view');
    const range = month ? normalizeMonthRange(month) : null;
    return this.db.query(
      `SELECT o.id,o.status,o.payment_status,o.total_amount,o.delivery_fee,o.delivery_person_id,p.method,p.refunded_amount,p.fee_amount,p.refund_status,p.transaction_id,p.payment_date,p.receipt_reference,s.paid_at AS delivery_paid_at
      FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN delivery_settlements s ON s.order_id=o.id WHERE o.unit_id=$1 AND (${conditions[view]})
      AND ($3::timestamptz IS NULL OR (o.order_date >= $3 AND o.order_date < $4)) ORDER BY o.id DESC LIMIT ${PAGE_SIZE} OFFSET $2`,
      [unitId, page * PAGE_SIZE, range?.start ?? null, range?.end ?? null],
    );
  }

  async history(orderId: number, user: User) {
    const order = await this.db.getRepository(Order).findOneByOrFail({ id: orderId });
    await this.units.assertHasPermission(user, order.unit_id, UnitPermission.VIEW_FINANCE);
    const [transactions, refunds, manual, settlements] = await Promise.all([
      this.db.query(
        'SELECT id,status,amount,refunded_amount,provider_updated_at,updated_at FROM payment_transactions WHERE unit_id=$1 AND reference IN ($2,$3) ORDER BY updated_at DESC',
        [order.unit_id, String(order.id), order.checkout_id],
      ),
      this.db.query(
        `SELECT r.id,r.payment_id,r.amount,r.status,r.reason,r.attempts,r.last_error,r.created_at,r.updated_at,
        COALESCE((SELECT json_agg(a ORDER BY a.created_at DESC) FROM (SELECT status,provider_id,actor_id,created_at FROM payment_refund_attempts WHERE refund_id=r.id) a),'[]') AS history
        FROM payment_refunds r WHERE r.unit_id=$1 AND (r.order_id=$2 OR (r.order_id IS NULL AND r.payment_id IN (SELECT id FROM payment_transactions WHERE unit_id=$1 AND reference IN ($3,$4)))) ORDER BY r.created_at DESC`,
        [order.unit_id, order.id, String(order.id), order.checkout_id],
      ),
      this.db.query(
        'SELECT kind,amount,reference,actor_id,created_at FROM payment_manual_events WHERE order_id=$1 ORDER BY created_at DESC',
        [order.id],
      ),
      this.db.query(
        'SELECT amount,reference,actor_id,delivery_person_id,paid_at FROM delivery_settlements WHERE order_id=$1',
        [order.id],
      ),
    ]);
    return { transactions, refunds, manual, settlement: settlements[0] ?? null };
  }

  async retryRefund(orderId: number, refundId: string, user: User) {
    const order = await this.db.getRepository(Order).findOneByOrFail({ id: orderId });
    await this.units.assertHasPermission(user, order.unit_id, UnitPermission.MANAGE_FINANCE);
    const mp = await this.sellers.forUnit(order.unit_id);
    const result = await this.db.transaction((manager) =>
      this.requestRefundRetry(manager, mp, order, refundId, user),
    );
    if (result.status === 'COMPLETED') await this.process(result.paymentId, order.unit_id);
    return { status: result.status };
  }

  private async requestRefundRetry(
    manager: EntityManager,
    mp: MercadoPagoService,
    order: Order,
    refundId: string,
    user: User,
  ): Promise<{ status: string; paymentId: string }> {
    await manager.findOneOrFail(Order, {
      where: { id: order.id },
      lock: { mode: 'pessimistic_write' },
    });
    const [refund]: RefundRow[] = await manager.query(
      `SELECT r.* FROM payment_refunds r WHERE r.id=$1 AND r.unit_id=$2 AND
        (r.order_id=$3 OR (r.order_id IS NULL AND r.payment_id IN (SELECT id FROM payment_transactions WHERE unit_id=$2 AND reference IN ($4,$5)))) FOR UPDATE`,
      [refundId, order.unit_id, order.id, String(order.id), order.checkout_id],
    );
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status !== 'FAILED') return { status: refund.status, paymentId: refund.payment_id };
    const retry = await this.planRefundRetry(mp, refund);
    await this.saveRefundRetry(manager, refund, retry, user.id);
    return { status: retry.state, paymentId: refund.payment_id };
  }

  private async planRefundRetry(mp: MercadoPagoService, refund: RefundRow): Promise<RefundRetry> {
    const unchanged = { providerId: refund.provider_id, key: refund.attempt_key };
    const snapshot = await mp.getPaymentSnapshot(refund.payment_id);
    if (
      snapshot.status === 'refunded' ||
      (snapshot.transactionAmount != null &&
        cents(snapshot.refundedAmount) >= cents(snapshot.transactionAmount))
    )
      return { state: 'COMPLETED', ...unchanged };
    if (!refund.provider_id) return { state: 'PENDING', ...unchanged };
    const previous = await mp.getRefund(refund.payment_id, refund.provider_id);
    if (previous.status === 'approved') return { state: 'COMPLETED', ...unchanged };
    if (previous.status === 'rejected')
      return { state: 'PENDING', providerId: null, key: randomUUID() };
    return { state: 'PENDING', ...unchanged };
  }

  private async saveRefundRetry(
    manager: EntityManager,
    refund: RefundRow,
    retry: RefundRetry,
    actorId: number,
  ): Promise<void> {
    await manager.query(
      'UPDATE payment_refunds SET status=$2,provider_id=$3,attempt_key=$4,retry_requested_by=$5,next_attempt_at=now(),last_error=NULL,updated_at=now() WHERE id=$1',
      [refund.id, retry.state, retry.providerId, retry.key, actorId],
    );
    if (refund.order_id)
      await manager.update(Payment, { order_id: refund.order_id }, { refund_status: retry.state });
    await manager.query(
      'INSERT INTO payment_refund_attempts(refund_id,attempt_key,provider_id,status,actor_id) VALUES($1,$2,$3,$4,$5)',
      [refund.id, retry.key, retry.providerId, 'RETRY_REQUESTED', actorId],
    );
  }

  async receive(orderId: number, user: User, amount: number, reference: string) {
    const order = await this.db.getRepository(Order).findOneByOrFail({ id: orderId });
    await this.units.assertHasPermission(user, order.unit_id, UnitPermission.MANAGE_FINANCE);
    return this.db.transaction(async (manager) => {
      const o = await manager.findOneOrFail(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      const p = await manager.findOneOrFail(Payment, {
        where: { order_id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !isOfflinePayment(p.method) ||
        o.status === OrderStatus.CANCELLED ||
        cents(amount) !== cents(o.total_amount)
      )
        throw new BadRequestException('Invalid receipt for this order');
      if (p.status === PaymentStatus.PAID) return { status: p.status };
      if (p.status !== PaymentStatus.PENDING)
        throw new BadRequestException('Payment is not pending');
      p.status = PaymentStatus.PAID;
      p.payment_date = new Date();
      p.received_by = user.id;
      p.receipt_reference = reference;
      o.payment_status = p.status;
      await manager.save(p);
      await manager.query(
        'INSERT INTO payment_manual_events(id,order_id,actor_id,kind,amount,reference) VALUES($1,$2,$3,$4,$5,$6)',
        [randomUUID(), orderId, user.id, 'RECEIPT', amount, reference],
      );
      await manager.save(o);
      return { status: p.status };
    });
  }

  async recordOfflineRefund(orderId: number, user: User, amount: number, reference: string) {
    const order = await this.db.getRepository(Order).findOneByOrFail({ id: orderId });
    await this.units.assertHasPermission(user, order.unit_id, UnitPermission.MANAGE_FINANCE);
    return this.db.transaction(async (manager) => {
      const o = await manager.findOneOrFail(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      const p = await manager.findOneOrFail(Payment, {
        where: { order_id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !isOfflinePayment(p.method) ||
        ![OrderStatus.CANCELLED, OrderStatus.DELIVERED].includes(o.status)
      )
        throw new BadRequestException('Invalid offline refund');
      if (p.status === PaymentStatus.REFUNDED) return { status: p.status };
      if (p.status !== PaymentStatus.PAID || cents(amount) !== cents(o.total_amount))
        throw new BadRequestException('Refund must match the received amount');
      p.status = PaymentStatus.REFUNDED;
      p.refunded_amount = amount;
      p.refund_status = 'COMPLETED';
      o.payment_status = p.status;
      await manager.query(
        'INSERT INTO payment_manual_events(id,order_id,actor_id,kind,amount,reference) VALUES($1,$2,$3,$4,$5,$6)',
        [randomUUID(), orderId, user.id, 'REFUND', amount, reference],
      );
      await manager.save(p);
      await manager.save(o);
      return { status: p.status };
    });
  }

  async settleDelivery(orderId: number, user: User, amount: number, reference: string) {
    const order = await this.db.getRepository(Order).findOneByOrFail({ id: orderId });
    await this.units.assertHasPermission(user, order.unit_id, UnitPermission.MANAGE_FINANCE);
    return this.db.transaction(async (manager) => {
      const o = await manager.findOneOrFail(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        o.status !== OrderStatus.DELIVERED ||
        !o.delivery_person_id ||
        cents(amount) !== cents(o.delivery_fee)
      )
        throw new BadRequestException('Settlement must match the completed delivery fee');
      await manager.query(
        'INSERT INTO delivery_settlements(order_id,delivery_person_id,actor_id,amount,reference) VALUES($1,$2,$3,$4,$5) ON CONFLICT(order_id) DO NOTHING',
        [orderId, o.delivery_person_id, user.id, amount, reference],
      );
      return { recorded: true };
    });
  }

  async reconcileOrder(id: number, user: User) {
    const order = await this.db.getRepository(Order).findOneByOrFail({ id });
    if (order.client_id !== user.id)
      await this.units.assertHasPermission(user, order.unit_id, UnitPermission.VIEW_FINANCE);
    await this.reconcile(String(id), order.unit_id);
    return { ok: true };
  }

  private async reconcile(reference: string, unitId: number) {
    const mp = await this.sellers.forUnit(unitId);
    const order = await this.db
      .getRepository(Order)
      .findOneBy({ id: Number(reference), unit_id: unitId });
    if (!order) return;
    const payment = await this.db.getRepository(Payment).findOneBy({ order_id: order.id });
    const references = new Set(
      [reference, payment?.payment_reference, order.checkout_id].filter((r): r is string => !!r),
    );
    const ids = new Set<string>();
    if (payment?.transaction_id) ids.add(payment.transaction_id);
    for (const ref of references) for (const id of await mp.searchPayments(ref)) ids.add(id);
    for (const id of ids) await this.process(id, unitId);
  }

  private async expire(manager: EntityManager, order: Order) {
    if (order.status !== OrderStatus.PENDING) return;
    await this.releaseReservation(manager, order);
    order.status = OrderStatus.CANCELLED;
    order.cancelled_at = new Date();
    order.cancelled_by = CancelledBy.SYSTEM;
    order.cancellation_reason = 'Payment deadline expired';
    await this.refundExpiredCapture(manager, order);
    await this.queueCustomerNotification(manager, order.id, order.status);
    if (OPEN_PAYMENT_STATUSES.includes(order.payment_status)) {
      order.payment_status = PaymentStatus.CANCELLED;
      await manager.update(Payment, { order_id: order.id }, { status: PaymentStatus.CANCELLED });
    }
    await manager.save(order);
    await this.recordStatusHistory(manager, order);
  }

  private async releaseReservation(manager: EntityManager, order: Order): Promise<void> {
    for (const item of await manager.find(OrderItem, {
      where: { order_id: order.id },
      order: { product_id: 'ASC' },
    })) {
      await manager.increment(Stock, { product_id: item.product_id }, 'quantity', item.quantity);
    }
    await this.coupons.releaseOrder(order.id, manager);
  }

  private async refundExpiredCapture(manager: EntityManager, order: Order): Promise<void> {
    const payment = await manager.findOne(Payment, {
      where: { order_id: order.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!payment?.transaction_id || !CAPTURED_PAYMENT_STATUSES.includes(payment.status)) return;
    payment.refund_status = await this.queueRefund(
      manager,
      payment.transaction_id,
      order.id,
      Number(order.total_amount) - Number(payment.refunded_amount),
      'Payment deadline expired',
      null,
      order.unit_id,
    );
    await manager.save(payment);
  }

  @Interval(MAINTENANCE_INTERVAL_MS)
  async expireReservations() {
    if (this.expiring) return;
    this.expiring = true;
    try {
      const expired = await this.db.query(
        `SELECT id FROM orders WHERE status='PENDING' AND payment_due_at < now() ORDER BY payment_due_at,id LIMIT ${EXPIRATION_BATCH_SIZE}`,
      );
      for (const { id } of expired)
        await this.db.transaction(async (manager) => {
          const order = await manager.findOneOrFail(Order, {
            where: { id },
            lock: { mode: 'pessimistic_write' },
          });
          if (
            order.payment_status === PaymentStatus.PAID ||
            !order.payment_due_at ||
            order.payment_due_at > new Date()
          )
            return;
          await this.expire(manager, order);
        });
    } finally {
      this.expiring = false;
    }
  }

  @Interval(MAINTENANCE_INTERVAL_MS)
  async maintain() {
    if (this.working) return;
    this.working = true;
    const runner = this.db.createQueryRunner();
    let locked = false;
    try {
      await runner.connect();
      const [lease] = await runner.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [
        MAINTENANCE_LOCK,
      ]);
      locked = lease.locked;
      if (!locked) return;
      await this.runMaintenance();
    } catch (error) {
      this.logger.error(
        'Payment maintenance failed',
        error instanceof Error ? error.message : 'unknown',
      );
    } finally {
      await this.releaseMaintenanceLease(runner, locked);
    }
  }

  private async releaseMaintenanceLease(runner: QueryRunner, locked: boolean): Promise<void> {
    try {
      if (locked) await runner.query('SELECT pg_advisory_unlock(hashtext($1))', [MAINTENANCE_LOCK]);
    } finally {
      await runner.release();
      this.working = false;
    }
  }

  private async runMaintenance(): Promise<void> {
    await this.expireReservations();
    if (this.sellers.configured) {
      await this.reconcileDuePayments();
      await this.runRefunds();
    }
    await this.dispatchPaymentNotifications();
    await this.observeRefundQueue();
  }

  private async reconcileDuePayments(): Promise<void> {
    const due = await this.db
      .query(`SELECT o.id::text AS reference, o.unit_id FROM orders o JOIN payments p ON p.order_id=o.id
          WHERE p.reconcile_after <= now() AND (p.mp_preference_id IS NOT NULL OR o.payment_due_at IS NOT NULL)
          AND (o.order_date > now()-interval '180 days' OR p.refund_status IN ('PENDING','FAILED'))
          ORDER BY p.reconcile_after,o.id LIMIT ${BATCH_SIZE}`);
    for (const { reference, unit_id: unitId } of due) {
      await this.db.query(
        `UPDATE payments p SET reconcile_after=now()+CASE WHEN p.status IN ('PENDING','REJECTED') OR p.refund_status='PENDING' OR (p.refund_status='COMPLETED' AND p.status='PARTIALLY_REFUNDED') THEN interval '2 minutes' ELSE interval '1 day' END FROM orders o WHERE p.order_id=o.id AND o.id::text=$1`,
        [reference],
      );
      try {
        await this.reconcile(reference, unitId);
      } catch {
        this.logger.warn(`Payment reconciliation pending for ${reference}`);
      }
    }
  }

  private async dispatchPaymentNotifications(): Promise<void> {
    const outgoing = await this.db.query(
      `SELECT id FROM payment_notifications WHERE sent_at IS NULL AND next_attempt_at<=now() ORDER BY next_attempt_at,id LIMIT ${BATCH_SIZE}`,
    );
    for (const { id } of outgoing) {
      try {
        await this.db.transaction((manager) => this.sendPaymentNotification(manager, id));
      } catch {
        await this.db.query(
          "UPDATE payment_notifications SET next_attempt_at=now()+interval '2 minutes' WHERE id=$1",
          [id],
        );
        this.logger.warn(`Order payment notification ${id} will be retried`);
      }
    }
  }

  private async sendPaymentNotification(manager: EntityManager, id: number): Promise<void> {
    const [event] = await manager.query(
      'SELECT * FROM payment_notifications WHERE id=$1 AND sent_at IS NULL FOR UPDATE SKIP LOCKED',
      [id],
    );
    if (!event) return;
    const order = await manager.findOneByOrFail(Order, { id: event.order_id });
    if (event.status.startsWith('PAYMENT_')) {
      const payment = await manager.findOneByOrFail(Payment, { order_id: order.id });
      if (event.status === `PAYMENT_${payment.status}`)
        await this.notifications.notifyCustomerOfPayment(order, payment.status);
    } else if (order.status === event.status)
      await this.notifications.notifyCustomerOfStatusChange(order);
    await manager.query('UPDATE payment_notifications SET sent_at=now() WHERE id=$1', [id]);
  }

  private async observeRefundQueue(): Promise<void> {
    const [queue] = await this.db.query(
      "SELECT COUNT(*) FILTER(WHERE status='PENDING') AS pending,COUNT(*) FILTER(WHERE status='FAILED') AS failed,COALESCE(EXTRACT(EPOCH FROM now()-MIN(created_at) FILTER(WHERE status='PENDING')),0) AS age FROM payment_refunds",
    );
    this.metrics?.observePayments(Number(queue.pending), Number(queue.failed), Number(queue.age));
  }

  private async runRefunds() {
    const pending = await this.db.query(
      `SELECT id FROM payment_refunds WHERE status='PENDING' AND next_attempt_at<=now() ORDER BY created_at LIMIT ${BATCH_SIZE}`,
    );
    for (const { id } of pending) await this.runRefund(id);
  }

  private async runRefund(id: string): Promise<void> {
    const [candidate] = await this.db.query(
      "SELECT unit_id FROM payment_refunds WHERE id=$1 AND status='PENDING'",
      [id],
    );
    if (!candidate) return;
    const mp = await this.sellerForRefund(id, candidate.unit_id);
    if (!mp) return;
    const completed = await this.db.transaction((manager) => this.attemptRefund(manager, mp, id));
    if (!completed) return;
    try {
      await this.process(completed.paymentId, completed.unitId);
    } catch {
      this.logger.warn(`Refund reconciliation pending for ${completed.paymentId}`);
    }
  }

  private async sellerForRefund(id: string, unitId: number): Promise<MercadoPagoService | null> {
    try {
      return await this.sellers.forUnit(unitId);
    } catch {
      await this.db.query(
        "UPDATE payment_refunds SET attempts=attempts+1,next_attempt_at=now()+interval '2 minutes',last_error='Seller authorization unavailable; retry scheduled',updated_at=now() WHERE id=$1 AND status='PENDING'",
        [id],
      );
      return null;
    }
  }

  private async attemptRefund(
    manager: EntityManager,
    mp: MercadoPagoService,
    id: string,
  ): Promise<CompletedRefund | null> {
    const [owner] = await manager.query('SELECT order_id FROM payment_refunds WHERE id=$1', [id]);
    if (owner?.order_id)
      await manager.findOne(Order, {
        where: { id: owner.order_id },
        lock: { mode: 'pessimistic_write' },
      });
    const [refund]: RefundRow[] = await manager.query(
      `SELECT * FROM payment_refunds WHERE id=$1 AND status='PENDING' FOR UPDATE SKIP LOCKED`,
      [id],
    );
    if (!refund) return null;
    await manager.query('SAVEPOINT refund_provider');
    try {
      return await this.submitRefund(manager, mp, refund);
    } catch (error) {
      await this.deferRefund(manager, id, error);
      return null;
    } finally {
      await manager.query('RELEASE SAVEPOINT refund_provider');
    }
  }

  private async submitRefund(
    manager: EntityManager,
    mp: MercadoPagoService,
    refund: RefundRow,
  ): Promise<CompletedRefund | null> {
    const result = await this.requestProviderRefund(mp, refund);
    const state =
      result.status === 'approved'
        ? 'COMPLETED'
        : result.status === 'rejected'
          ? 'FAILED'
          : 'PENDING';
    await manager.query(
      `UPDATE payment_refunds SET provider_id=$2,status=$3::varchar,attempts=attempts+1,next_attempt_at=now()+interval '2 minutes',updated_at=now(),last_error=CASE WHEN $3::varchar='FAILED' THEN 'Provider rejected the refund; review and retry' ELSE NULL END WHERE id=$1`,
      [refund.id, result.id, state],
    );
    await manager.query(
      'INSERT INTO payment_refund_attempts(refund_id,attempt_key,provider_id,status,actor_id) VALUES($1,$2,$3,$4,$5)',
      [
        refund.id,
        refund.attempt_key,
        result.id,
        state,
        refund.retry_requested_by ?? refund.requested_by,
      ],
    );
    if (refund.order_id)
      await manager.update(Payment, { order_id: refund.order_id }, { refund_status: state });
    return state === 'COMPLETED' ? { paymentId: refund.payment_id, unitId: refund.unit_id } : null;
  }

  private async requestProviderRefund(
    mp: MercadoPagoService,
    refund: RefundRow,
  ): Promise<{ id: string | null; status: string }> {
    const latest = await mp.getPaymentSnapshot(refund.payment_id);
    const alreadyRefunded =
      latest.status === 'refunded' ||
      (Number(latest.transactionAmount) > 0 &&
        cents(latest.refundedAmount) >= cents(latest.transactionAmount!));
    if (alreadyRefunded) return { id: refund.provider_id, status: 'approved' };
    return refund.provider_id
      ? mp.getRefund(refund.payment_id, refund.provider_id)
      : mp.refund(refund.payment_id, refund.attempt_key);
  }

  private async deferRefund(manager: EntityManager, id: string, error: unknown): Promise<void> {
    await manager.query('ROLLBACK TO SAVEPOINT refund_provider');
    if (error instanceof QueryFailedError)
      this.logger.error(`Refund persistence failed: ${error.driverError.message}`);
    await manager.query(
      `UPDATE payment_refunds SET attempts=attempts+1,next_attempt_at=now()+interval '2 minutes',last_error='Provider unavailable; retry scheduled',updated_at=now() WHERE id=$1`,
      [id],
    );
  }
}
