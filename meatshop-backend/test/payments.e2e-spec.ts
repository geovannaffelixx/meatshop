import { RepeatOrderUseCase } from '../src/orders/use-cases/repeat-order.use-case';
import { CartAccessService } from '../src/cart/services/cart-access.service';
import { CreateOrderUseCase } from '../src/orders/use-cases/create-order.use-case';
import { QuoteCartUseCase } from '../src/orders/use-cases/quote-cart.use-case';
import { CheckoutQuoteService } from '../src/orders/services/checkout-quote.service';
import { CheckoutPricingService } from '../src/orders/services/checkout-pricing.service';
import { DeliveryCodeService } from '../src/orders/services/delivery-code.service';
import { StockAvailabilityValidator } from '../src/orders/validators/stock-availability.validator';
import { DeliveryType } from '../src/orders/enums/delivery-type.enum';
import { Address } from '../src/users/entities/address.entity';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PaymentsController } from '../src/payments/payments.controller';
import { UserUnit } from '../src/units/entities/user-unit.entity';
import { LocalRole } from '../src/common/enums/local-role.enum';
import { UnitPermissionPolicy } from '../src/units/services/unit-permission.policy';
import { GetMonthlyRevenueUseCase } from '../src/finance/use-cases/get-monthly-revenue.use-case';
import type { OrderAuthorizationService } from '../src/orders/services/order-authorization.service';
import { Cart } from '../src/cart/entities/cart.entity';
import { CartItem } from '../src/cart/entities/cart-item.entity';
/* global jest, beforeEach */
import { PaymentReceipts1790550001000 } from '../src/database/migrations/1790550001000-PaymentReceipts';
import { PaymentOperations1791900000000 } from '../src/database/migrations/1791900000000-PaymentOperations';
import { PaymentStateIntegrity1791900001000 } from '../src/database/migrations/1791900001000-PaymentStateIntegrity';
import { PaymentContract1791900002000 } from '../src/database/migrations/1791900002000-PaymentContract';
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
import { UnitAuthorizationService } from '../src/units/services/unit-authorization.service';
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
    createCheckoutPreference: jest.fn(async (_params: unknown) => ({
      preferenceId: 'preference',
      checkoutUrl: 'https://mercadopago.com.br/checkout',
    })),
    searchPayments: jest.fn(async () => [] as string[]),
    refund: jest.fn(async () => ({ id: 'refund', status: 'approved' })),
    getRefund: jest.fn(async () => ({ id: 'refund', status: 'approved' })),
  };
  const sellers = {
    enabled: true,
    configured: true,
    forUnit: jest.fn(async () => mp),
    assertAcceptingPayments: jest.fn(async () => {}),
  } as unknown as SellerAccountsService;
  const units = {
    assertHasPermission: jest.fn(async () => {}),
  } as unknown as UnitAuthorizationService;
  const coupons = { releaseOrder: jest.fn(async () => {}) } as unknown as CouponRedemptionService;

  const notifications = {
    notifyCustomerOfStatusChange: jest.fn(async () => {}),
    notifyCustomerOfPayment: jest.fn(async () => {}),
  };
  beforeAll(async () => {
    db = new DataSource({
      entities: source.options.entities,
      type: 'postgres',
      host: '127.0.0.1',
      port: Number(process.env.PAYMENTS_TEST_PORT ?? process.env.DB_PORT ?? 5433),
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
    if (!(await runner.hasColumn('payments', 'payment_reference')))
      await new PaymentOperations1791900000000().up(runner);
    if (
      !(await runner.query("SELECT 1 FROM pg_trigger WHERE tgname='orders_payment_consistent'"))
        .length
    )
      await new PaymentStateIntegrity1791900001000().up(runner);
    await runner.release();
    const contractRunner = db.createQueryRunner();
    if (!(await contractRunner.hasColumn('order_items', 'product_snapshot')))
      await new PaymentContract1791900002000().up(contractRunner);
    await contractRunner.release();
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
    await db.query(
      "UPDATE payments SET reconcile_after=now()+interval '1 year' WHERE order_id IN (SELECT id FROM orders WHERE unit_id=$1)",
      [unit.id],
    );
    await db.query(
      'DELETE FROM payment_refund_attempts WHERE refund_id IN (SELECT id FROM payment_refunds WHERE unit_id=$1)',
      [unit.id],
    );
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
      await db.query('DELETE FROM payment_seller_events WHERE unit_id=$1', [unit.id]);
      await db.query(
        'DELETE FROM payment_refund_attempts WHERE refund_id IN (SELECT id FROM payment_refunds WHERE unit_id=$1)',
        [unit.id],
      );
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
  it('does not assign a previously accepted transaction to another order after reference tampering', async () => {
    await lifecycle.process(paymentId(), unit.id);
    const another = await db.getRepository(Order).save({
      client_id: user.id,
      unit_id: unit.id,
      total_amount: 50,
      subtotal: 50,
      checkout_id: randomUUID(),
    });
    await db.getRepository(Payment).save({ order_id: another.id, method: PaymentMethod.PIX });
    snapshot.externalReference = String(another.id);
    await expect(lifecycle.process(paymentId(), unit.id)).rejects.toThrow(
      'reference or seller changed',
    );
    await expect(
      db.getRepository(Payment).update({ order_id: another.id }, { transaction_id: paymentId() }),
    ).rejects.toThrow();
    expect((await db.getRepository(Order).findOneByOrFail({ id: another.id })).payment_status).toBe(
      PaymentStatus.PENDING,
    );
  });
  it('reports receipts in the Brazilian month and revises the same period for external refunds', async () => {
    snapshot.approvedAt = new Date('2026-02-01T01:00:00Z');
    const revenue = new GetMonthlyRevenueUseCase(db.getRepository(Order), units);
    await lifecycle.process(paymentId(), unit.id);
    expect((await revenue.forUnit(unit.id, '2026-01')).revenueTotal).toBe(49);
    expect((await revenue.forUnit(unit.id, '2026-02')).revenueTotal).toBe(0);
    snapshot.refundedAmount = 20;
    await lifecycle.process(paymentId(), unit.id);
    expect((await revenue.forUnit(unit.id, '2026-01')).revenueTotal).toBe(29);
    snapshot.refundedAmount = 50;
    snapshot.status = 'refunded';
    await lifecycle.process(paymentId(), unit.id);
    expect((await revenue.forUnit(unit.id, '2026-01')).revenueTotal).toBe(0);
  });
  it('protects financial HTTP routes with real JWT authentication, DTO validation and unit permissions', async () => {
    await db.getRepository(User).update(user.id, { is_active: true, profile_complete: true });
    const outsider = await db.getRepository(User).save({
      name: 'Outside payment user',
      email: `outsider-${randomUUID()}@example.invalid`,
      is_active: true,
      profile_complete: true,
    });
    const membership = await db
      .getRepository(UserUnit)
      .save({ user_id: user.id, unit_id: unit.id, local_role: LocalRole.OWNER });
    const config = new ConfigService({ JWT_SECRET: 'http-payment-test-secret' });
    const realUnits = new UnitAuthorizationService(
      db.getRepository(Unit),
      db.getRepository(UserUnit),
      new UnitPermissionPolicy(),
    );
    const realPayments = new PaymentLifecycleService(
      db,
      sellers,
      realUnits,
      coupons,
      notifications as unknown as SendOrderStatusNotificationUseCase,
    );
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentLifecycleService, useValue: realPayments },
        { provide: JwtStrategy, useValue: new JwtStrategy(config, db.getRepository(User)) },
      ],
    }).compile();
    const app = module.createNestApplication();
    app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    const jwt = new JwtService({ secret: 'http-payment-test-secret' });
    const token = jwt.sign({ sub: user.id });
    const outsiderToken = jwt.sign({ sub: outsider.id });
    try {
      await request(app.getHttpServer()).get(`/payments/orders?unit_id=${unit.id}`).expect(401);
      await request(app.getHttpServer())
        .get(`/payments/orders?unit_id=${unit.id}`)
        .auth(outsiderToken, { type: 'bearer' })
        .expect(403);
      await request(app.getHttpServer())
        .get(`/payments/orders?unit_id=${unit.id}&view=arbitrary`)
        .auth(token, { type: 'bearer' })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/payments/orders/${order.id}/receipt`)
        .auth(token, { type: 'bearer' })
        .send({ amount: -1, reference: '   ' })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/payments/orders/${order.id}/receipt`)
        .auth(token, { type: 'bearer' })
        .send({ amount: 50, reference: 'Receipt test' })
        .expect(400);
      await db
        .getRepository(Payment)
        .update({ order_id: order.id }, { method: PaymentMethod.CASH });
      await request(app.getHttpServer())
        .post(`/payments/orders/${order.id}/receipt`)
        .auth(token, { type: 'bearer' })
        .send({ amount: 50, reference: ' Receipt test ' })
        .expect(201);
      const response = await request(app.getHttpServer())
        .get(`/payments/orders/${order.id}/history`)
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(response.body.manual).toHaveLength(1);
      expect(response.body.manual[0].reference).toBe('Receipt test');
      await request(app.getHttpServer())
        .get(`/payments/orders/${order.id}/history`)
        .auth(outsiderToken, { type: 'bearer' })
        .expect(403);
    } finally {
      await app.close();
      await db.getRepository(UserUnit).delete(membership.id);
      await db.getRepository(User).delete(outsider.id);
    }
  });
  it('enforces matching order/payment states at commit while allowing atomic transitions', async () => {
    await expect(
      db.getRepository(Payment).update({ order_id: order.id }, { status: PaymentStatus.PAID }),
    ).rejects.toThrow();
    await db.transaction(async (manager) => {
      await manager.update(Payment, { order_id: order.id }, { status: PaymentStatus.PAID });
      await manager.update(Order, order.id, { payment_status: PaymentStatus.PAID });
    });
    expect((await db.getRepository(Order).findOneByOrFail({ id: order.id })).payment_status).toBe(
      PaymentStatus.PAID,
    );
  });
  it('creates signed multi-seller orders once under concurrency and rolls back changed quotes', async () => {
    const second = await db.getRepository(Unit).save({
      name: 'Second payment seller',
      cnpj: String(Date.now() + 100).padStart(14, '0'),
      city: 'Recife',
      state: 'PE',
      zip_code: '50000-000',
      admin_id: user.id,
    });
    const categories: Category[] = [];
    const products: Product[] = [];
    const key = randomUUID();
    const changedKey = randomUUID();
    let cart: Cart | undefined;
    try {
      const access = new CartAccessService(db.getRepository(Cart), db.getRepository(CartItem));
      cart = await access.getOrCreateCart(user.id);
      for (const [store, price] of [
        [unit, 10],
        [second, 20],
      ] as const) {
        const category = await db
          .getRepository(Category)
          .save({ unit_id: store.id, name: 'Payment test category' });
        categories.push(category);
        const product = await db.getRepository(Product).save({
          unit_id: store.id,
          category_id: category.id,
          name: 'Payment test item',
          price,
          unit_of_measure: 'un',
          active: true,
        });
        products.push(product);
        await db.getRepository(Stock).save({ product_id: product.id, quantity: 5 });
        await db
          .getRepository(CartItem)
          .save({ cart_id: cart.id, product_id: product.id, quantity: 1, unit_price: price });
      }
      const config = new ConfigService({ JWT_SECRET: 'test-quote-signing-secret' });
      const pricing = new CheckoutPricingService(config);
      const signing = new CheckoutQuoteService(config);
      const couponService = {
        prepare: async () => null,
        consume: async () => {},
        releaseOrder: async () => {},
      } as unknown as CouponRedemptionService;
      const hours = { assertWithinBusinessHours: async () => {} } as never;
      const notifier = {
        notifyUnitOfNewOrder: async () => {},
        notifyCustomerOfDeliveryCode: async () => {},
      } as unknown as SendOrderStatusNotificationUseCase;
      const creator = new CreateOrderUseCase(
        db.getRepository(Order),
        db.getRepository(OrderItem),
        db.getRepository(Payment),
        access,
        couponService,
        pricing,
        hours,
        notifier,
        new DeliveryCodeService(config, db.getRepository(Order)),
        db,
        sellers,
        signing,
      );
      const quote = new QuoteCartUseCase(
        db.getRepository(CartItem),
        db.getRepository(Address),
        db.getRepository(Unit),
        access,
        pricing,
        couponService,
        new StockAvailabilityValidator(db.getRepository(Stock)),
        hours,
        db,
        sellers,
        signing,
      );
      const selection = {
        delivery_type: DeliveryType.PICKUP,
        payment_method: PaymentMethod.CASH,
        unit_payment_methods: [{ unit_id: second.id, method: PaymentMethod.PIX }],
      };
      const quoted = await quote.execute(selection, user);
      const dto = {
        ...selection,
        quote_token: quoted.quote_token,
        expected_total: quoted.total_amount,
      };
      await db.getRepository(Product).update(products[0].id, { price: 15 });
      await expect(creator.execute(dto, user, changedKey)).rejects.toThrow();
      expect(await db.getRepository(Order).countBy({ checkout_id: changedKey })).toBe(0);
      expect(
        Number(
          (await db.getRepository(Stock).findOneByOrFail({ product_id: products[0].id })).quantity,
        ),
      ).toBe(5);
      await db.getRepository(Product).update(products[0].id, { price: 10 });
      const [first, replayed] = await Promise.all([
        creator.execute(dto, user, key),
        creator.execute(dto, user, key),
      ]);
      expect(first.orders.map((o) => o.id)).toEqual(replayed.orders.map((o) => o.id));
      expect(first.orders).toHaveLength(2);
      expect(first.orders.find((o) => o.unit_id === unit.id)?.payment?.method).toBe(
        PaymentMethod.CASH,
      );
      expect(first.orders.find((o) => o.unit_id === second.id)?.payment_due_at).not.toBeNull();
      expect(
        Number(
          (await db.getRepository(Stock).findOneByOrFail({ product_id: products[0].id })).quantity,
        ),
      ).toBe(4);
      expect((await creator.recover(key, user))?.orders.map((o) => o.id)).toEqual(
        first.orders.map((o) => o.id),
      );
      await expect(creator.execute({ ...dto, expected_total: 99 }, user, key)).rejects.toThrow();
    } finally {
      await db.getRepository(Order).delete({ checkout_id: key });
      await db.getRepository(Order).delete({ checkout_id: changedKey });
      if (cart) await db.getRepository(Cart).delete(cart.id);
      for (const product of products) await db.getRepository(Product).delete(product.id);
      for (const category of categories) await db.getRepository(Category).delete(category.id);
      await db.getRepository(Unit).delete(second.id);
    }
  });
  it('returns a different late approved attempt after a rejected attempt was cancelled', async () => {
    await db.transaction(async (manager) => {
      await manager.update(Order, order.id, {
        status: OrderStatus.CANCELLED,
        payment_status: PaymentStatus.CANCELLED,
      });
      await manager.update(
        Payment,
        { order_id: order.id },
        { status: PaymentStatus.CANCELLED, transaction_id: `rejected-${order.id}` },
      );
    });
    await lifecycle.process(paymentId(), unit.id);
    const p = await db.getRepository(Payment).findOneByOrFail({ order_id: order.id });
    expect(p.transaction_id).toBe(paymentId());
    expect(p.refund_status).toBe('PENDING');
    expect(
      await db.query('SELECT id FROM payment_refunds WHERE payment_id=$1', [paymentId()]),
    ).toHaveLength(1);
  });

  it('uses canonical order references and recovers legacy UUID preferences without a webhook', async () => {
    await lifecycle.checkout(order.checkout_id!, user);
    expect(mp.createCheckoutPreference.mock.calls[0][0]).toMatchObject({
      checkoutId: String(order.id),
    });
    snapshot.externalReference = order.checkout_id;
    mp.searchPayments.mockResolvedValueOnce([]).mockResolvedValueOnce([paymentId()]);
    await lifecycle.reconcileOrder(order.id, user);
    expect(mp.searchPayments).toHaveBeenCalledWith(order.checkout_id);
    expect((await db.getRepository(Order).findOneByOrFail({ id: order.id })).status).toBe(
      OrderStatus.CONFIRMED,
    );
  });

  it('only rotates refund identity after confirming the earlier provider rejection', async () => {
    await db.getRepository(Order).update(order.id, { status: OrderStatus.CANCELLED });
    await lifecycle.process(paymentId(), unit.id);
    mp.refund.mockResolvedValueOnce({ id: 'rejected-refund', status: 'rejected' });
    await lifecycle.maintain();
    const [first] = await db.query('SELECT * FROM payment_refunds WHERE order_id=$1', [order.id]);
    expect(first.status).toBe('FAILED');
    mp.getRefund.mockResolvedValueOnce({ id: 'rejected-refund', status: 'rejected' });
    await lifecycle.retryRefund(order.id, first.id, user);
    const [retry] = await db.query('SELECT * FROM payment_refunds WHERE id=$1', [first.id]);
    expect(retry.status).toBe('PENDING');
    expect(retry.attempt_key).not.toBe(first.attempt_key);
    expect(retry.provider_id).toBeNull();
    mp.refund.mockImplementationOnce(async () => {
      snapshot.refundedAmount = 50;
      snapshot.status = 'refunded';
      return { id: 'accepted-refund', status: 'approved' };
    });
    await lifecycle.maintain();
    expect((await lifecycle.history(order.id, user)).refunds[0].status).toBe('COMPLETED');
  });

  it('keeps existing refunds running when new online payments are suspended', async () => {
    await db.getRepository(Order).update(order.id, { status: OrderStatus.CANCELLED });
    await lifecycle.process(paymentId(), unit.id);
    Object.assign(sellers, { enabled: false });
    try {
      await expect(lifecycle.checkout(String(order.id), user)).rejects.toThrow();
      mp.refund.mockImplementationOnce(async () => {
        snapshot.refundedAmount = 50;
        snapshot.status = 'refunded';
        return { id: 'refund', status: 'approved' };
      });
      await lifecycle.maintain();
      expect((await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).status).toBe(
        PaymentStatus.REFUNDED,
      );
    } finally {
      Object.assign(sellers, { enabled: true });
    }
  });

  it('recognizes an externally completed refund even after its earlier request failed', async () => {
    await db.getRepository(Order).update(order.id, { status: OrderStatus.CANCELLED });
    await lifecycle.process(paymentId(), unit.id);
    await db.query("UPDATE payment_refunds SET status='FAILED' WHERE order_id=$1", [order.id]);
    snapshot.refundedAmount = 50;
    snapshot.status = 'refunded';
    await lifecycle.process(paymentId(), unit.id);
    expect((await lifecycle.history(order.id, user)).refunds[0].status).toBe('COMPLETED');
    expect(
      (await db.getRepository(Payment).findOneByOrFail({ order_id: order.id })).refund_status,
    ).toBe('COMPLETED');
  });
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
  it('keeps a seller-compensated confirmed order active after a partial refund', async () => {
    snapshot.refundedAmount = 20;
    await lifecycle.process(paymentId(), unit.id);
    await db.getRepository(Order).update(order.id, { payment_due_at: new Date(0) });
    await lifecycle.maintain();
    const saved = await db.getRepository(Order).findOneByOrFail({ id: order.id });
    const payment = await db.getRepository(Payment).findOneByOrFail({ order_id: order.id });
    expect(saved.status).toBe(OrderStatus.CONFIRMED);
    expect(saved.payment_status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(payment.status).toBe(saved.payment_status);
    expect(
      await db.query('SELECT id FROM payment_refunds WHERE order_id=$1', [order.id]),
    ).toHaveLength(0);
  });
  it('returns the remaining balance for a partial approval discovered after the deadline', async () => {
    snapshot.refundedAmount = 20;
    await db.getRepository(Order).update(order.id, { payment_due_at: new Date(0) });
    await lifecycle.process(paymentId(), unit.id);
    const saved = await db.getRepository(Order).findOneByOrFail({ id: order.id });
    expect(saved.status).toBe(OrderStatus.CANCELLED);
    expect(saved.payment_status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    const [refund] = await db.query('SELECT amount FROM payment_refunds WHERE order_id=$1', [
      order.id,
    ]);
    expect(Number(refund.amount)).toBe(30);
  });
});
