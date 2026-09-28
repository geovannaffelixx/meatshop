import { RepeatOrderUseCase } from '../src/orders/use-cases/repeat-order.use-case';
import type { CartAccessService } from '../src/cart/services/cart-access.service';
import type { OrderAuthorizationService } from '../src/orders/services/order-authorization.service';
import { Cart } from '../src/cart/entities/cart.entity';
import { CartItem } from '../src/cart/entities/cart-item.entity';
/* global jest, beforeEach */
import { PaymentReceipts1790550001000 } from '../src/database/migrations/1790550001000-PaymentReceipts';
import type { SendOrderStatusNotificationUseCase } from '../src/notifications/use-cases/send-order-status-notification.use-case';
import { Product } from '../src/products/entities/product.entity';
import { Category } from '../src/categories/entities/category.entity';
import { Stock } from '../src/products/entities/stock.entity';
import { OrderItem } from '../src/orders/entities/order-item.entity';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import source from '../src/database/data-source';
import { HardenPayments1790550000000 } from '../src/database/migrations/1790550000000-HardenPayments';
import { PaymentLifecycleService } from '../src/payments/payment-lifecycle.service';
import { ConfigService } from '@nestjs/config';
import { SellerAccountsService } from '../src/payments/seller-accounts.service';
import type { UnitAuthorizationService } from '../src/units/services/unit-authorization.service';
import type { CouponRedemptionService } from '../src/promotions/services/coupon-redemption.service';
import type { MercadoPagoPaymentSnapshot } from '../src/payments/providers/mercadopago.service';
import { User } from '../src/users/entities/user.entity';
import { Unit } from '../src/units/entities/unit.entity';
import { Order } from '../src/orders/entities/order.entity';
import { Payment } from '../src/orders/entities/payment.entity';
import { OrderStatusHistory } from '../src/orders/entities/order-status-history.entity';
import { PaymentMethod } from '../src/orders/enums/payment-method.enum';
import { PaymentStatus } from '../src/orders/enums/payment-status.enum';
import { OrderStatus } from '../src/orders/enums/order-status.enum';

const enabled = process.env.PAYMENTS_TEST_DATABASE === 'meatshop_payments_test';
(enabled ? describe : describe.skip)('Payments with isolated PostgreSQL', () => {
  let db: DataSource;
  let user: User;
  let unit: Unit;
  let order: Order;
  let lifecycle: PaymentLifecycleService;
  let snapshot: MercadoPagoPaymentSnapshot;
  const mp = {
    getPaymentSnapshot: jest.fn(async () => snapshot),
    mapPaymentMethod: jest.fn(() => PaymentMethod.PIX),
    createCheckoutPreference: jest.fn(async () => ({
      preferenceId: 'preference',
      checkoutUrl: 'https://mercadopago.com.br/checkout',
    })),
    searchPayments: jest.fn(async () => [] as string[]),
    refund: jest.fn(async () => ({ id: 'refund', status: 'approved' })),
    getRefund: jest.fn(async () => ({ id: 'refund', status: 'approved' })),
  };
  const sellers = {
    enabled: true,
    forUnit: jest.fn(async () => mp),
  } as unknown as SellerAccountsService;
  const units = {
    assertHasPermission: jest.fn(async () => {}),
  } as unknown as UnitAuthorizationService;
  const coupons = { releaseOrder: jest.fn(async () => {}) } as unknown as CouponRedemptionService;

  const notifications = { notifyCustomerOfStatusChange: jest.fn(async () => {}) };
  beforeAll(async () => {
    db = new DataSource({
      entities: source.options.entities,
      type: 'postgres',
      host: '127.0.0.1',
      port: 5433,
      username: 'meatshop_user',
      password: 'meatshop_pass',
      database: 'meatshop_payments_test',
      ssl: false,
      synchronize: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    if (!(await runner.hasTable('payment_transactions')))
      await new HardenPayments1790550000000().up(runner);
    if (!(await runner.hasTable('payment_manual_events')))
      await new PaymentReceipts1790550001000().up(runner);
    await runner.release();
    user = await db
      .getRepository(User)
      .save({ name: 'Payment test', email: `payment-${randomUUID()}@example.invalid` });
    unit = await db.getRepository(Unit).save({
      name: 'Payment test',
      cnpj: String(Date.now()).padStart(14, '0'),
      city: 'Recife',
      state: 'PE',
      zip_code: '50000-000',
      admin_id: user.id,
    });
    lifecycle = new PaymentLifecycleService(
      db,
      sellers,
      units,
      coupons,
      notifications as unknown as SendOrderStatusNotificationUseCase,
    );
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    await db.query('DELETE FROM payment_refunds WHERE unit_id=$1', [unit.id]);
    await db.query(
      'DELETE FROM payment_notifications WHERE order_id IN (SELECT id FROM orders WHERE unit_id=$1)',
      [unit.id],
    );
    order = await db.getRepository(Order).save({
      client_id: user.id,
      unit_id: unit.id,
      total_amount: 50,
      subtotal: 50,
      checkout_id: randomUUID(),
      payment_due_at: new Date(Date.now() + 86400000),
    });
    await db.getRepository(Payment).save({ order_id: order.id, method: PaymentMethod.PIX });
    snapshot = {
      externalReference: String(order.id),
      status: 'approved',
      statusDetail: 'accredited',
      paymentTypeId: 'bank_transfer',
      paymentMethodId: 'pix',
      approvedAt: new Date(),
      transactionAmount: 50,
      currencyId: 'BRL',
      updatedAt: new Date(),
      refundedAmount: 0,
      feeAmount: 1,
      liveMode: false,
    };
  });
  afterAll(async () => {
    if (unit) {
      await db.query('DELETE FROM payment_oauth_states WHERE unit_id=$1', [unit.id]);
      await db.query('DELETE FROM payment_sellers WHERE unit_id=$1', [unit.id]);
      await db.query('DELETE FROM payment_refunds WHERE unit_id=$1', [unit.id]);
      await db.query('DELETE FROM payment_transactions WHERE unit_id=$1', [unit.id]);
      await db.query(
        'DELETE FROM payment_manual_events WHERE order_id IN (SELECT id FROM orders WHERE unit_id=$1)',
        [unit.id],
      );
      await db.query('DELETE FROM orders WHERE unit_id=$1', [unit.id]);
      await db.getRepository(Unit).delete(unit.id);
      await db.getRepository(User).delete(user.id);
    }
    await db?.destroy();
  });
  const paymentId = () => `test-${order.id}`;
  it('atomically approves and confirms; duplicate delivery does not duplicate history', async () => {
    await Promise.all([
      lifecycle.process(paymentId(), unit.id),
      lifecycle.process(paymentId(), unit.id),
    ]);
    expect((await db.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe(
      OrderStatus.CONFIRMED,
    );
    expect(
      await db
        .getRepository(OrderStatusHistory)
        .countBy({ order_id: order.id, status: OrderStatus.CONFIRMED }),
    ).toBe(1);
    expect((await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).method).toBe(
      PaymentMethod.PIX,
    );
  });
  it('rolls back payment if confirmation persistence fails, then recovers on retry', async () => {
    const original = EntityManager.prototype.save;
    const spy = jest.spyOn(EntityManager.prototype, 'save').mockImplementation(function (
      this: EntityManager,
      ...args: unknown[]
    ) {
      if (args[0] === OrderStatusHistory) return Promise.reject(new Error('Simulated DB failure'));
      return original.apply(this, args as Parameters<typeof original>);
    });
    try {
      await expect(lifecycle.process(paymentId(), unit.id)).rejects.toThrow('Simulated');
    } finally {
      spy.mockRestore();
    }
    expect((await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).status).toBe(
      PaymentStatus.PENDING,
    );
    await lifecycle.process(paymentId(), unit.id);
    expect((await db.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe(
      OrderStatus.CONFIRMED,
    );
  });
  it('rejects wrong amounts and seller identities without updating payment', async () => {
    snapshot.transactionAmount = 49;
    await expect(lifecycle.process(paymentId(), unit.id)).rejects.toThrow();
    snapshot.transactionAmount = 50;
    await expect(lifecycle.process(paymentId(), unit.id + 1)).rejects.toThrow();
    expect((await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).status).toBe(
      PaymentStatus.PENDING,
    );
  });
  it('serializes preference creation and prevents another customer or cancelled order from paying', async () => {
    await Promise.all([
      lifecycle.checkout(String(order.id), user),
      lifecycle.checkout(String(order.id), user),
    ]);
    expect(mp.createCheckoutPreference).toHaveBeenCalledTimes(1);
    await expect(
      lifecycle.checkout(String(order.id), { ...user, id: user.id + 1 }),
    ).rejects.toThrow();
    await db.getRepository(Order).update(order.id, { status: OrderStatus.CANCELLED });
    await expect(lifecycle.checkout(String(order.id), user)).rejects.toThrow();
  });
  it('queues a single refund for late approval on a cancelled order', async () => {
    await db.getRepository(Order).update(order.id, { status: OrderStatus.CANCELLED });
    await lifecycle.process(paymentId(), unit.id);
    await lifecycle.process(paymentId(), unit.id);
    const jobs = await db.query('SELECT * FROM payment_refunds WHERE order_id=$1', [order.id]);
    expect(jobs).toHaveLength(1);
    expect(Number(jobs[0].amount)).toBe(50);
    expect((await db.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe(
      OrderStatus.CANCELLED,
    );
  });
  it('records another successful charge separately and queues its return', async () => {
    await lifecycle.process(paymentId(), unit.id);
    await lifecycle.process(`${paymentId()}-duplicate`, unit.id);
    expect(
      (await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).transaction_id,
    ).toBe(paymentId());
    expect(
      await db.query('SELECT * FROM payment_refunds WHERE payment_id=$1', [
        `${paymentId()}-duplicate`,
      ]),
    ).toHaveLength(1);
  });
  it('ignores older events and accounts for partial refunds and chargebacks', async () => {
    await lifecycle.process(paymentId(), unit.id);
    snapshot.updatedAt = new Date(Date.now() + 1000);
    snapshot.refundedAmount = 20;
    await lifecycle.process(paymentId(), unit.id);
    expect((await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).status).toBe(
      PaymentStatus.PARTIALLY_REFUNDED,
    );
    snapshot.updatedAt = new Date(0);
    snapshot.status = 'rejected';
    await lifecycle.process(paymentId(), unit.id);
    expect((await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).status).toBe(
      PaymentStatus.PARTIALLY_REFUNDED,
    );
    snapshot.updatedAt = new Date(Date.now() + 2000);
    snapshot.status = 'charged_back';
    await lifecycle.process(paymentId(), unit.id);
    expect((await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).status).toBe(
      PaymentStatus.CHARGED_BACK,
    );
  });
  it('records exact cash receipt idempotently and rejects online/manual mismatch', async () => {
    await expect(lifecycle.receive(order.id, user, 50, 'receipt')).rejects.toThrow();
    await db.getRepository(Payment).update({ order_id: order.id }, { method: PaymentMethod.CASH });
    await expect(lifecycle.receive(order.id, user, 49, 'receipt')).rejects.toThrow();
    await lifecycle.receive(order.id, user, 50, 'receipt');
    await lifecycle.receive(order.id, user, 50, 'receipt');
    expect(
      (await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).received_by,
    ).toBe(user.id);
  });
  it('expires an unpaid order once, restores reserved stock and releases its coupon even if notifications fail', async () => {
    const category = await db
      .getRepository(Category)
      .save({ name: 'Payment test', unit_id: unit.id });
    const product = await db.getRepository(Product).save({
      name: 'Test product',
      unit_id: unit.id,
      category_id: category.id,
      price: 50,
      unit_of_measure: 'kg',
    });
    const stock = await db.getRepository(Stock).save({ product_id: product.id, quantity: 2 });
    await db
      .getRepository(OrderItem)
      .save({ order_id: order.id, product_id: product.id, quantity: 1, unit_price: 50 });
    await db.getRepository(Order).update(order.id, { payment_due_at: new Date(0) });
    await db.query('INSERT INTO payment_notifications(order_id,status) VALUES($1,$2)', [
      order.id,
      'PENDING',
    ]);
    notifications.notifyCustomerOfStatusChange.mockRejectedValueOnce(
      new Error('Notification outage'),
    );
    await lifecycle.maintain();
    await lifecycle.maintain();
    expect((await db.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe(
      OrderStatus.CANCELLED,
    );
    expect((await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).status).toBe(
      PaymentStatus.CANCELLED,
    );
    expect(Number((await db.getRepository(Stock).findOneByOrFail({ id: stock.id })).quantity)).toBe(
      3,
    );
    expect(coupons.releaseOrder).toHaveBeenCalledTimes(1);
    await db.getRepository(OrderItem).delete({ order_id: order.id });
    await db.getRepository(Product).delete(product.id);
    await db.getRepository(Category).delete(category.id);
  });
  it('retries an uncertain refund with the same durable idempotency key', async () => {
    await db.getRepository(Order).update(order.id, { status: OrderStatus.CANCELLED });
    await lifecycle.process(paymentId(), unit.id);
    mp.refund.mockRejectedValueOnce(new Error('Network timeout'));
    await lifecycle.maintain();
    const [first] = await db.query('SELECT * FROM payment_refunds WHERE order_id=$1', [order.id]);
    expect(first.status).toBe('PENDING');
    expect(first.attempts).toBe(1);
    await db.query('UPDATE payment_refunds SET next_attempt_at=now() WHERE id=$1', [first.id]);
    mp.refund.mockImplementationOnce(async () => {
      snapshot.refundedAmount = 50;
      snapshot.status = 'refunded';
      snapshot.updatedAt = new Date(Date.now() + 1000);
      return { id: 'refund', status: 'approved' };
    });
    await lifecycle.maintain();
    expect(mp.refund.mock.calls[0]).toEqual(mp.refund.mock.calls[1]);
    expect((await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).status).toBe(
      PaymentStatus.REFUNDED,
    );
    expect(
      (await db.query('SELECT status FROM payment_refunds WHERE id=$1', [first.id]))[0].status,
    ).toBe('COMPLETED');
  });
  it('records offline refunds once and enforces finance permissions', async () => {
    await db.getRepository(Payment).update({ order_id: order.id }, { method: PaymentMethod.CASH });
    await lifecycle.receive(order.id, user, 50, 'cash receipt');
    await db.getRepository(Order).update(order.id, { status: OrderStatus.CANCELLED });
    await expect(
      lifecycle.recordOfflineRefund(order.id, user, 49, 'refund receipt'),
    ).rejects.toThrow();
    await lifecycle.recordOfflineRefund(order.id, user, 50, 'refund receipt');
    await lifecycle.recordOfflineRefund(order.id, user, 50, 'refund receipt');
    expect(
      await db.query("SELECT * FROM payment_manual_events WHERE order_id=$1 AND kind='REFUND'", [
        order.id,
      ]),
    ).toHaveLength(1);
    (units.assertHasPermission as jest.Mock).mockRejectedValueOnce(new Error('Forbidden'));
    await expect(lifecycle.list(unit.id, user, 0)).rejects.toThrow('Forbidden');
  });

  it('connects an authorized seller with one-use PKCE state, encrypted tokens and refresh', async () => {
    const config = new ConfigService({
      PAYMENTS_ENABLED: 'true',
      MP_CLIENT_ID: 'client',
      MP_CLIENT_SECRET: 'secret',
      MP_OAUTH_REDIRECT_URI: 'https://example.invalid/callback',
      MP_CREDENTIAL_ENCRYPTION_KEY: 'test-encryption-key',
      MP_WEBHOOK_SECRET: 'webhook',
    });
    const accounts = new SellerAccountsService(db, config, units);
    const { url } = await accounts.connect(unit.id, user);
    const auth = new URL(url);
    expect(auth.searchParams.get('code_challenge_method')).toBe('S256');
    const state = auth.searchParams.get('state')!;
    const remote = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        user_id: 77,
        access_token: 'seller-secret',
        refresh_token: 'refresh-secret',
        expires_in: 3600,
      }),
    } as Response);
    try {
      await expect(accounts.callback('code', 'wrong-state')).rejects.toThrow();
      await accounts.callback('code', state);
      const [stored] = await db.query('SELECT * FROM payment_sellers WHERE unit_id=$1', [unit.id]);
      expect(stored.collector_id).toBe('77');
      expect(stored.access_token).not.toContain('seller-secret');
      const sent = JSON.parse(String(remote.mock.calls[0][1]?.body));
      expect(sent.code_verifier).toBeTruthy();
      expect(sent.grant_type).toBe('authorization_code');
      await expect(accounts.callback('code', state)).rejects.toThrow();
      await db.query(
        "UPDATE payment_sellers SET expires_at=now()-interval '1 minute' WHERE unit_id=$1",
        [unit.id],
      );
      await accounts.forUnit(unit.id, true);
      expect(JSON.parse(String(remote.mock.calls[1][1]?.body)).grant_type).toBe('refresh_token');
      const { url: again } = await accounts.connect(unit.id, user);
      remote.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user_id: 88,
          access_token: 'other',
          refresh_token: 'other',
          expires_in: 3600,
        }),
      } as Response);
      await expect(
        accounts.callback('other-code', new URL(again).searchParams.get('state')!),
      ).rejects.toThrow('same seller');
      expect((await accounts.status(unit.id, user)).collector_id).toBe('77');
    } finally {
      remote.mockRestore();
    }
  });
  it('reordering only prepares a cart with current prices and never creates a charge or new order', async () => {
    const category = await db
      .getRepository(Category)
      .save({ name: 'Repeat test', unit_id: unit.id });
    const product = await db.getRepository(Product).save({
      name: 'Test product',
      unit_id: unit.id,
      category_id: category.id,
      price: 60,
      unit_of_measure: 'kg',
    });
    await db.getRepository(Stock).save({ product_id: product.id, quantity: 10 });
    await db
      .getRepository(OrderItem)
      .save({ order_id: order.id, product_id: product.id, quantity: 1, unit_price: 50 });
    const cart = await db.getRepository(Cart).save({ user_id: user.id });
    const repeat = new RepeatOrderUseCase(
      db.getRepository(Order),
      { getOrCreateCart: async () => cart } as unknown as CartAccessService,
      { assertOwnsOrder: jest.fn() } as unknown as OrderAuthorizationService,
    );
    const count = await db.getRepository(Order).countBy({ client_id: user.id });
    await repeat.execute(order.id, user);
    await repeat.execute(order.id, user);
    const items = await db.getRepository(CartItem).findBy({ cart_id: cart.id });
    expect(items).toHaveLength(1);
    expect(Number(items[0].unit_price)).toBe(60);
    expect(await db.getRepository(Order).countBy({ client_id: user.id })).toBe(count);
    expect(mp.createCheckoutPreference).not.toHaveBeenCalled();
    await db.getRepository(Cart).delete(cart.id);
    await db.getRepository(OrderItem).delete({ order_id: order.id });
    await db.getRepository(Product).delete(product.id);
    await db.getRepository(Category).delete(category.id);
  });
  it('preserves partial payment accounting and queues the remaining refund when the reservation expires', async () => {
    snapshot.refundedAmount = 20;
    await lifecycle.process(paymentId(), unit.id);
    await db.getRepository(Order).update(order.id, { payment_due_at: new Date(0) });
    await lifecycle.maintain();
    const saved = await db.getRepository(Order).findOneByOrFail({ id: order.id });
    const payment = await db.getRepository(Payment).findOneByOrFail({ order_id: order.id });
    expect(saved.status).toBe(OrderStatus.CANCELLED);
    expect(saved.payment_status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(payment.status).toBe(saved.payment_status);
    const [refund] = await db.query('SELECT amount FROM payment_refunds WHERE order_id=$1', [
      order.id,
    ]);
    expect(Number(refund.amount)).toBe(30);
  });
});
