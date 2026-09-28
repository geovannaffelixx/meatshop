import { SendOrderStatusNotificationUseCase } from '../notifications/use-cases/send-order-status-notification.use-case';
import { SellerAccountsService } from './seller-accounts.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { DataSource, EntityManager } from 'typeorm';
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
import { MercadoPagoPaymentSnapshot } from './providers/mercadopago.service';
import { cents, isOfflinePayment } from './payment-policy';

@Injectable()
export class PaymentLifecycleService {
  private readonly logger = new Logger(PaymentLifecycleService.name);
  private working = false;

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly sellers: SellerAccountsService,
    private readonly units: UnitAuthorizationService,
    private readonly coupons: CouponRedemptionService,
    private readonly notifications: SendOrderStatusNotificationUseCase,
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
    return this.db.transaction(async (manager) => {
      const orders = await this.lockReference(manager, reference);
      if (!orders.length) throw new NotFoundException('Checkout not found');
      if (orders.length !== 1) throw new BadRequestException('Pay each butcher separately');
      // Only the customer who placed this order may obtain its checkout URL.
      if (orders.some((o) => o.client_id !== user.id))
        throw new ForbiddenException('Checkout does not belong to current user');
      if (
        orders.some(
          (o) =>
            o.status !== OrderStatus.PENDING ||
            o.payment_status === PaymentStatus.PAID ||
            !o.payment_due_at ||
            o.payment_due_at <= new Date(),
        )
      ) {
        throw new BadRequestException({
          code: 'CHECKOUT_NOT_PAYABLE',
          message: 'This checkout is paid, expired or no longer pending.',
        });
      }
      const payments = await manager
        .getRepository(Payment)
        .createQueryBuilder('p')
        .addSelect('p.mp_checkout_url')
        .where('p.order_id IN (:...ids)', { ids: orders.map((o) => o.id) })
        .getMany();
      if (payments.length !== orders.length || payments.some((p) => isOfflinePayment(p.method)))
        throw new BadRequestException('This order does not use online payment');
      const existing = payments.find((p) => p.mp_checkout_url);
      if (existing) return { checkoutId: reference, checkoutUrl: existing.mp_checkout_url };
      const mp = await this.sellers.forUnit(orders[0].unit_id, true);
      const preference = await mp.createCheckoutPreference({
        checkoutId: reference,
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
        await manager.save(Payment, p);
      }
      return { checkoutId: reference, ...preference };
    });
  }

  async process(paymentId: string, unitId: number): Promise<void> {
    const mp = await this.sellers.forUnit(unitId);
    const snapshot = await mp.getPaymentSnapshot(paymentId);
    if (!snapshot.externalReference || !/^(\d+|[0-9a-f-]{36})$/i.test(snapshot.externalReference))
      return;
    await this.db.transaction(async (manager) => {
      const orders = await this.lockReference(manager, snapshot.externalReference!);
      if (!orders.length) return;
      if (orders.length !== 1 || orders[0].unit_id !== unitId)
        throw new BadRequestException('Payment seller mismatch');
      const total = orders.reduce((sum, o) => sum + cents(o.total_amount), 0);
      if (
        snapshot.currencyId !== 'BRL' ||
        snapshot.transactionAmount == null ||
        !Number.isFinite(snapshot.transactionAmount) ||
        cents(snapshot.transactionAmount) !== total ||
        !Number.isFinite(snapshot.refundedAmount) ||
        snapshot.refundedAmount < 0 ||
        cents(snapshot.refundedAmount) > total ||
        !Number.isFinite(snapshot.feeAmount) ||
        snapshot.feeAmount < 0
      ) {
        throw new BadRequestException('Payment amount or currency does not match checkout');
      }
      const previous = await manager.query(
        'SELECT * FROM payment_transactions WHERE id = $1 FOR UPDATE',
        [paymentId],
      );
      if (
        previous[0]?.provider_updated_at &&
        snapshot.updatedAt &&
        new Date(previous[0].provider_updated_at) > snapshot.updatedAt
      )
        return;
      await manager.query(
        `INSERT INTO payment_transactions(id, reference, status, amount, refunded_amount, provider_updated_at,unit_id)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status, refunded_amount=EXCLUDED.refunded_amount,
        provider_updated_at=EXCLUDED.provider_updated_at, updated_at=now()`,
        [
          paymentId,
          snapshot.externalReference,
          snapshot.status ?? 'unknown',
          snapshot.transactionAmount,
          snapshot.refundedAmount,
          snapshot.updatedAt,
          unitId,
        ],
      );
      const payments = await manager
        .getRepository(Payment)
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.order_id IN (:...ids)', { ids: orders.map((o) => o.id) })
        .getMany();
      const status = this.status(snapshot);
      // Additional successful charges must be returned, never overwrite the accepted transaction.
      if (
        status === PaymentStatus.PAID &&
        payments.some(
          (p) =>
            p.transaction_id &&
            p.transaction_id !== paymentId &&
            [
              PaymentStatus.PAID,
              PaymentStatus.PARTIALLY_REFUNDED,
              PaymentStatus.REFUNDED,
              PaymentStatus.CHARGED_BACK,
            ].includes(p.status),
        )
      ) {
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
      const byOrder = new Map(payments.map((p) => [p.order_id, p]));
      // Allocate external refunds deterministically; known per-order refunds take precedence.
      const refunds = await manager.query(
        "SELECT order_id, SUM(amount)::numeric AS amount FROM payment_refunds WHERE payment_id=$1 AND status='COMPLETED' GROUP BY order_id",
        [paymentId],
      );
      let remainingRefund = cents(snapshot.refundedAmount);
      const allocated = new Map<number, number>();
      for (const o of orders) {
        const known = Math.min(
          cents(o.total_amount),
          cents(refunds.find((r: { order_id: number }) => r.order_id === o.id)?.amount ?? 0),
          remainingRefund,
        );
        allocated.set(o.id, known);
        remainingRefund -= known;
      }
      for (const o of orders) {
        const extra = Math.min(cents(o.total_amount) - allocated.get(o.id)!, remainingRefund);
        allocated.set(o.id, allocated.get(o.id)! + extra);
        remainingRefund -= extra;
      }
      let remainingFee = cents(snapshot.feeAmount);
      for (const [index, order] of orders.entries()) {
        const p = byOrder.get(order.id);
        if (!p) throw new BadRequestException('Payment record missing');
        if (
          p.transaction_id &&
          p.transaction_id !== paymentId &&
          p.status !== PaymentStatus.PENDING &&
          p.status !== PaymentStatus.REJECTED
        )
          continue;
        if (
          [
            PaymentStatus.PAID,
            PaymentStatus.PARTIALLY_REFUNDED,
            PaymentStatus.REFUNDED,
            PaymentStatus.CHARGED_BACK,
          ].includes(p.status) &&
          [PaymentStatus.PENDING, PaymentStatus.REJECTED, PaymentStatus.CANCELLED].includes(status)
        )
          continue;
        p.transaction_id = paymentId;
        p.mp_status_detail = snapshot.statusDetail;
        p.mp_last_event_at = new Date();
        p.method =
          mp.mapPaymentMethod(snapshot.paymentTypeId, snapshot.paymentMethodId) ?? p.method;
        p.refunded_amount = allocated.get(order.id)! / 100;
        const fee =
          index === orders.length - 1
            ? remainingFee
            : Math.min(
                remainingFee,
                Math.round((cents(snapshot.feeAmount) * cents(order.total_amount)) / total),
              );
        p.fee_amount = fee / 100;
        remainingFee -= fee;
        p.status =
          status === PaymentStatus.CHARGED_BACK
            ? status
            : p.refunded_amount >= Number(order.total_amount)
              ? PaymentStatus.REFUNDED
              : p.refunded_amount > 0
                ? PaymentStatus.PARTIALLY_REFUNDED
                : status;
        if (snapshot.approvedAt) p.payment_date = snapshot.approvedAt;
        order.payment_status = p.status;
        if ([PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED].includes(p.status)) {
          if (
            order.status === OrderStatus.CANCELLED ||
            (order.status === OrderStatus.PENDING &&
              order.payment_due_at &&
              (snapshot.approvedAt ?? new Date()) > order.payment_due_at)
          ) {
            if (order.status !== OrderStatus.CANCELLED) await this.expire(manager, order);
            p.refund_status = await this.queueRefund(
              manager,
              paymentId,
              order.id,
              Number(order.total_amount) - Number(p.refunded_amount),
              'Cancelled or expired order',
              null,
              unitId,
            );
          } else if (order.status === OrderStatus.PENDING && p.status === PaymentStatus.PAID) {
            order.status = OrderStatus.CONFIRMED;
            await manager.query(
              'INSERT INTO payment_notifications(order_id,status) VALUES($1,$2) ON CONFLICT DO NOTHING',
              [order.id, order.status],
            );
            await manager.save(
              OrderStatusHistory,
              manager.create(OrderStatusHistory, {
                order_id: order.id,
                status: order.status,
                updated_by: null,
              }),
            );
          }
        }
        await manager.save(Payment, p);
        await manager.save(Order, order);
      }
    });
  }

  private status(s: MercadoPagoPaymentSnapshot): PaymentStatus {
    switch (s.status) {
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
      `INSERT INTO payment_refunds(id,payment_id,order_id,amount,reason,requested_by,unit_id) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING status`,
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
        !p.transaction_id ||
        ![PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED].includes(p.status)
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

  async list(unitId: number, user: User, page: number) {
    await this.units.assertHasPermission(user, unitId, UnitPermission.VIEW_FINANCE);
    if (!Number.isSafeInteger(page) || page < 0 || page > 10000)
      throw new BadRequestException('Invalid page');
    return this.db.query(
      `SELECT o.id,o.status,o.payment_status,o.total_amount,o.delivery_fee,o.delivery_person_id,p.method,p.refunded_amount,p.fee_amount,p.refund_status,s.paid_at AS delivery_paid_at
      FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN delivery_settlements s ON s.order_id=o.id WHERE o.unit_id=$1 ORDER BY o.id DESC LIMIT 20 OFFSET $2`,
      [unitId, page * 20],
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
    for (const id of await mp.searchPayments(reference)) await this.process(id, unitId);
  }

  private async expire(manager: EntityManager, order: Order) {
    if (order.status !== OrderStatus.PENDING) return;
    for (const item of await manager.find(OrderItem, {
      where: { order_id: order.id },
      order: { product_id: 'ASC' },
    })) {
      await manager.increment(Stock, { product_id: item.product_id }, 'quantity', item.quantity);
    }
    await this.coupons.releaseOrder(order.id, manager);
    order.status = OrderStatus.CANCELLED;
    order.cancelled_at = new Date();
    order.cancelled_by = CancelledBy.SYSTEM;
    order.cancellation_reason = 'Payment deadline expired';
    const payment = await manager.findOne(Payment, {
      where: { order_id: order.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (
      payment?.transaction_id &&
      [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)
    ) {
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
    await manager.query(
      'INSERT INTO payment_notifications(order_id,status) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [order.id, order.status],
    );
    if (
      [PaymentStatus.PENDING, PaymentStatus.REJECTED, PaymentStatus.CANCELLED].includes(
        order.payment_status,
      )
    ) {
      order.payment_status = PaymentStatus.CANCELLED;
      await manager.update(Payment, { order_id: order.id }, { status: PaymentStatus.CANCELLED });
    }
    await manager.save(order);
    await manager.save(
      OrderStatusHistory,
      manager.create(OrderStatusHistory, {
        order_id: order.id,
        status: order.status,
        updated_by: null,
      }),
    );
  }

  @Interval(30_000)
  async maintain() {
    if (this.working) return;
    this.working = true;
    try {
      if (this.sellers.enabled) {
        const due = await this.db
          .query(`SELECT o.id::text AS reference, o.unit_id FROM orders o JOIN payments p ON p.order_id=o.id
          WHERE p.reconcile_after <= now() AND (p.mp_preference_id IS NOT NULL OR o.payment_due_at IS NOT NULL) ORDER BY p.reconcile_after,o.id LIMIT 20`);
        for (const { reference, unit_id: unitId } of due) {
          await this.db.query(
            `UPDATE payments p SET reconcile_after=now()+interval '10 minutes' FROM orders o WHERE p.order_id=o.id AND o.id::text=$1`,
            [reference],
          );
          try {
            await this.reconcile(reference, unitId);
          } catch {
            this.logger.warn(`Payment reconciliation pending for ${reference}`);
          }
        }
        await this.runRefunds();
      }
      const outgoing = await this.db.query(
        'SELECT id FROM payment_notifications WHERE sent_at IS NULL AND next_attempt_at<=now() ORDER BY next_attempt_at,id LIMIT 20',
      );
      for (const { id } of outgoing) {
        try {
          await this.db.transaction(async (manager) => {
            const [event] = await manager.query(
              'SELECT * FROM payment_notifications WHERE id=$1 AND sent_at IS NULL FOR UPDATE SKIP LOCKED',
              [id],
            );
            if (!event) return;
            const order = await manager.findOneByOrFail(Order, { id: event.order_id });
            if (order.status === event.status)
              await this.notifications.notifyCustomerOfStatusChange(order);
            await manager.query('UPDATE payment_notifications SET sent_at=now() WHERE id=$1', [id]);
          });
        } catch {
          await this.db.query(
            "UPDATE payment_notifications SET next_attempt_at=now()+interval '2 minutes' WHERE id=$1",
            [id],
          );
          this.logger.warn(`Order payment notification ${id} will be retried`);
        }
      }
      const expired = await this.db.query(
        `SELECT id FROM orders WHERE status='PENDING' AND payment_due_at < now() ORDER BY payment_due_at LIMIT 50`,
      );
      for (const { id } of expired)
        await this.db.transaction(async (manager) => {
          const order = await manager.findOneOrFail(Order, {
            where: { id },
            lock: { mode: 'pessimistic_write' },
          });
          if (order.payment_status === PaymentStatus.PAID) return;
          await this.expire(manager, order);
        });
    } catch (error) {
      this.logger.error(
        'Payment maintenance failed',
        error instanceof Error ? error.message : 'unknown',
      );
    } finally {
      this.working = false;
    }
  }

  private async runRefunds() {
    const pending = await this.db.query(
      `SELECT id FROM payment_refunds WHERE status='PENDING' AND next_attempt_at<=now() ORDER BY created_at LIMIT 20`,
    );
    for (const { id } of pending) {
      let paymentId: string | null = null;
      let unitId = 0;
      await this.db.transaction(async (manager) => {
        const [r] = await manager.query(
          `SELECT * FROM payment_refunds WHERE id=$1 AND status='PENDING' FOR UPDATE SKIP LOCKED`,
          [id],
        );
        if (!r) return;
        try {
          unitId = r.unit_id;
          const mp = await this.sellers.forUnit(unitId);
          const latest = await mp.getPaymentSnapshot(r.payment_id);
          const alreadyRefunded =
            latest.status === 'refunded' ||
            (Number(latest.transactionAmount) > 0 &&
              cents(latest.refundedAmount) >= cents(latest.transactionAmount!));
          // All supported refund requests return the remaining payment in full.
          // An empty provider body also tolerates a partial refund made by the seller externally.
          const result = alreadyRefunded
            ? { id: r.provider_id, status: 'approved' }
            : r.provider_id
              ? await mp.getRefund(r.payment_id, r.provider_id)
              : await mp.refund(r.payment_id, r.id);
          const state =
            result.status === 'approved'
              ? 'COMPLETED'
              : result.status === 'rejected'
                ? 'FAILED'
                : 'PENDING';
          await manager.query(
            `UPDATE payment_refunds SET provider_id=$2,status=$3,attempts=attempts+1,next_attempt_at=now()+interval '2 minutes',updated_at=now(),last_error=NULL WHERE id=$1`,
            [id, result.id, state],
          );
          if (r.order_id)
            await manager.update(Payment, { order_id: r.order_id }, { refund_status: state });
          if (state === 'COMPLETED') paymentId = r.payment_id;
        } catch {
          await manager.query(
            `UPDATE payment_refunds SET attempts=attempts+1,next_attempt_at=now()+interval '2 minutes',last_error='Provider unavailable; retry scheduled',updated_at=now() WHERE id=$1`,
            [id],
          );
        }
      });
      if (paymentId) {
        try {
          await this.process(paymentId, unitId);
        } catch {
          this.logger.warn(`Refund reconciliation pending for ${paymentId}`);
        }
      }
    }
  }
}
