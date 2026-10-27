import { BusinessHours } from '../src/units/entities/business-hours.entity';
import type { Weekday } from '../src/units/enums/weekday.enum';
/* global jest */
import { ConfigService } from '@nestjs/config';
import { PaymentWebhookQueueService } from '../src/payments/payment-webhook-queue.service';
import { RateLimitMiddleware } from '../src/common/middleware/rate-limit.middleware';
import { MetricsService } from '../src/metrics/metrics.service';
import type { Request, Response } from 'express';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Unit } from '../src/units/entities/unit.entity';
import { Category } from '../src/categories/entities/category.entity';
import { Product } from '../src/products/entities/product.entity';
import { Promotion } from '../src/promotions/entities/promotion.entity';
import { Stock } from '../src/products/entities/stock.entity';
import { AuthSessionService } from '../src/auth/services/auth-session.service';
import { PaymentLifecycleService } from '../src/payments/payment-lifecycle.service';
import { SendNotificationUseCase } from '../src/notifications/use-cases/send-notification.use-case';
import { SendOrderStatusNotificationUseCase } from '../src/notifications/use-cases/send-order-status-notification.use-case';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { cpfBlindIndex } from '../src/users/services/user-identity-index';
import { GlobalRole } from '../src/common/enums/global-role.enum';
import { FirebaseService } from '../src/integrations/firebase/firebase.service';
import { LegalPolicyService } from '../src/legal/services/legal-policy.service';
import { auditRequestContext } from '../src/audit/audit-request-context';

const enabled = process.env.E2E_TEST_DATABASE === 'meatshop_gaps_test_330';
(enabled ? describe : describe.skip)('Checklist contracts with isolated PostgreSQL', () => {
  let app: INestApplication;
  let db: DataSource;
  let user: User;
  let token: string;
  let unit: Unit;
  let product: Product;
  const randomIp = randomUUID();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SendNotificationUseCase)
      .useValue({ execute: async () => ({}) })
      .overrideProvider(SendOrderStatusNotificationUseCase)
      .useValue({
        notifyUnitOfNewOrder: async () => {},
        notifyCustomerOfDeliveryCode: async () => {},
        notifyCustomerOfStatusChange: async () => {},
        notifyCustomerOfPayment: async () => {},
      })
      .compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(app.get(AllExceptionsFilter));
    await app.init();
    db = app.get(DataSource);
    if (db.options.database !== 'meatshop_gaps_test_330') throw new Error('Unsafe test database');
    user = await db.getRepository(User).save(
      db.getRepository(User).create({
        email: `checklist-${randomUUID()}@example.test`,
        name: 'Checklist user',
        cpf: '12345678909',
        phone: '11987654321',
        password_hash: await bcrypt.hash('Password123!', 4),
        profile_complete: true,
        is_active: true,
        email_verified: true,
        global_role: GlobalRole.SUPER_ADMIN,
      }),
    );
    token = await app.get(JwtService).signAsync({ sub: user.id });
    unit = await db.getRepository(Unit).save({
      name: 'Checklist unit',
      cnpj: randomUUID().replace(/\D/g, '').padEnd(14, '0').slice(0, 14),
      admin_id: user.id,
      city: 'Test',
      state: 'GO',
      zip_code: '75000000',
      street: 'Test street',
      number: '1',
      neighborhood: 'Center',
      is_active: true,
    });
    const category = await db
      .getRepository(Category)
      .save({ name: 'Checklist meat', unit_id: unit.id, active: true });
    product = await db.getRepository(Product).save({
      name: 'Checklist meat',
      unit_id: unit.id,
      category_id: category.id,
      price: 50,
      unit_of_measure: 'KG',
      active: true,
    });
    await db.getRepository(Stock).save({ product_id: product.id, quantity: 10, min_quantity: 1 });
  });
  afterAll(async () => {
    await app?.close();
  });

  it('encrypts identities and returns plaintext in an authorized export', async () => {
    const [row] = await db.query('SELECT cpf,phone,cpf_hash FROM users WHERE id=$1', [user.id]);
    expect(row.cpf).toMatch(/^enc:v1:/);
    expect(row.phone).not.toContain('11987654321');
    expect(row.cpf_hash).toBe(cpfBlindIndex('12345678909'));
    const result = await request(app.getHttpServer())
      .get('/users/me/export')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(JSON.stringify(result.body)).toContain('12345678909');
    expect(JSON.stringify(result.body)).not.toContain('enc:v1:');
  });

  it('persists contact encrypted, returns it to the owner and denies another user', async () => {
    const result = await request(app.getHttpServer())
      .post('/support-tickets')
      .auth(token, { type: 'bearer' })
      .send({
        category: 'TECHNICAL',
        subject: 'Contact test',
        contact: '  support@example.test  ',
      })
      .expect(201);
    expect(result.body.contact).toBe('support@example.test');
    const [row] = await db.query('SELECT contact FROM support_tickets WHERE id=$1', [
      result.body.id,
    ]);
    expect(row.contact).toMatch(/^enc:v1:/);
    const other = await db
      .getRepository(User)
      .save({ email: `other-${randomUUID()}@example.test`, is_active: true });
    const otherToken = await app.get(JwtService).signAsync({ sub: other.id });
    await request(app.getHttpServer())
      .get(`/support-tickets/${result.body.id}`)
      .auth(otherToken, { type: 'bearer' })
      .expect(404);
  });

  it('validates CSRF on cookie mutations and leaves Bearer requests usable', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', `access_token=${token}`)
      .send({ refresh_token: 'unknown' })
      .expect(403);
    const csrf = await request(app.getHttpServer()).get('/auth/csrf').expect(200);
    const cookies = csrf.headers['set-cookie'] as unknown as string[];
    const result = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', [`access_token=${token}`, cookies[0].split(';')[0]])
      .set('x-csrf-token', csrf.body.csrf_token)
      .send({ refresh_token: 'unknown' });
    expect(result.status).toBe(401);
    expect(result.body.code).not.toBe('CSRF_TOKEN_INVALID');
  });

  it('emits tokens in JSON only for mobile login and revokes reused refresh families', async () => {
    const unsupported = await app
      .get(JwtService)
      .signAsync({ sub: user.id }, { algorithm: 'HS384' });
    await request(app.getHttpServer())
      .get('/users/me')
      .auth(unsupported, { type: 'bearer' })
      .expect(401);
    const web = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'Password123!' })
      .expect(200);
    expect(web.body.access_token).toBeUndefined();
    expect(web.headers['set-cookie']).toBeDefined();
    const mobile = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-client-platform', 'mobile')
      .send({ email: user.email, password: 'Password123!' })
      .expect(200);
    expect(mobile.body.access_token).toEqual(expect.any(String));
    const sessions = app.get(AuthSessionService);
    const rotated = await sessions.rotate(mobile.body.refresh_token);
    await expect(sessions.rotate(mobile.body.refresh_token)).rejects.toThrow();
    await expect(sessions.rotate(rotated.refresh_token)).rejects.toThrow();
  });

  it('appends legal revocation history and requires the document again', async () => {
    const documents = await db.query(
      "SELECT id,kind FROM legal_documents WHERE is_current AND kind<>'ESTABLISHMENT_TERMS'",
    );
    const selection = {
      document_ids: documents.map((document: { id: number }) => document.id),
      accepted: true,
      channel: 'mobile',
    };
    await request(app.getHttpServer())
      .post('/legal/acceptances')
      .auth(token, { type: 'bearer' })
      .send(selection)
      .expect(201);
    const [acceptance] = await db.query(
      `SELECT a.id FROM legal_acceptances a JOIN legal_documents d ON d.id=a.document_id
      WHERE a.user_id=$1 AND d.kind='PLATFORM_TERMS' ORDER BY a.id DESC LIMIT 1`,
      [user.id],
    );
    await request(app.getHttpServer())
      .post(`/legal/acceptances/${acceptance.id}/revoke`)
      .auth(token, { type: 'bearer' })
      .send({})
      .expect(201);
    const pending = await request(app.getHttpServer())
      .get('/legal/pending')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(pending.body.documents.map((document: { kind: string }) => document.kind)).toContain(
      'PLATFORM_TERMS',
    );
    await request(app.getHttpServer())
      .post('/legal/acceptances')
      .auth(token, { type: 'bearer' })
      .send(selection)
      .expect(201);
    const [effective] = await db.query(
      'SELECT event_type FROM legal_acceptances WHERE user_id=$1 AND document_id=$2 ORDER BY id DESC LIMIT 1',
      [
        user.id,
        documents.find((document: { kind: string }) => document.kind === 'PLATFORM_TERMS').id,
      ],
    );
    expect(effective.event_type).toBe('ACCEPTED');
    const [notice] = await db.query(
      `SELECT a.id FROM legal_acceptances a JOIN legal_documents d ON d.id=a.document_id
      WHERE a.user_id=$1 AND d.kind='PRIVACY_NOTICE' LIMIT 1`,
      [user.id],
    );
    await request(app.getHttpServer())
      .post(`/legal/acceptances/${notice.id}/revoke`)
      .auth(token, { type: 'bearer' })
      .send({})
      .expect(400);
  });

  it('returns the remaining login lock in JSON and Retry-After, then unlocks', async () => {
    await db.query("UPDATE users SET locked_until=now()+interval '10 minutes' WHERE id=$1", [
      user.id,
    ]);
    const blocked = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'Password123!' })
      .expect(429);
    expect(blocked.body.code).toBe('ACCOUNT_LOCKED');
    expect(blocked.body.retry_after_seconds).toBeGreaterThan(590);
    expect(Number(blocked.headers['retry-after'])).toBe(blocked.body.retry_after_seconds);
    expect(new Date(blocked.body.locked_until).getTime()).toBeGreaterThan(Date.now());
    await db.query("UPDATE users SET locked_until=now()-interval '1 minute' WHERE id=$1", [
      user.id,
    ]);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'Password123!' })
      .expect(200);
  });

  it('uses atomic database counters across concurrent limiter instances', async () => {
    const config = new ConfigService({
      RATE_LIMIT_MAX: '2',
      RATE_LIMIT_WINDOW_MS: '60000',
    });
    const instances = [
      new RateLimitMiddleware(config, db, app.get(MetricsService)),
      new RateLimitMiddleware(config, db, app.get(MetricsService)),
    ];
    let accepted = 0;
    let rejected = 0;
    const response = {
      setHeader: () => {},
      status: (status: number) => {
        if (status === 429) rejected++;
        return { json: () => {} };
      },
    } as unknown as Response;
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        instances[index % 2].use(
          {
            method: 'GET',
            path: '/products',
            ip: randomIp,
            socket: {},
          } as Request,
          response,
          (error?: unknown) => {
            if (error) throw error;
            accepted++;
          },
        ),
      ),
    );
    expect(accepted).toBe(2);
    expect(rejected).toBe(18);
  });

  it('blocks access immediately after mandatory revocation and allows recovery and reacceptance', async () => {
    const enforced = jest
      .spyOn(app.get(LegalPolicyService), 'enforced', 'get')
      .mockReturnValue(true);
    try {
      const [acceptance] = await db.query(
        "SELECT a.id FROM legal_acceptances a JOIN legal_documents d ON d.id=a.document_id WHERE a.user_id=$1 AND d.kind='PLATFORM_TERMS' ORDER BY a.id DESC LIMIT 1",
        [user.id],
      );
      await request(app.getHttpServer())
        .post(`/legal/acceptances/${acceptance.id}/revoke`)
        .auth(token, { type: 'bearer' })
        .send({})
        .expect(201);
      const blocked = await request(app.getHttpServer())
        .get('/cart')
        .auth(token, { type: 'bearer' })
        .expect(403);
      expect(blocked.body.code).toBe('LEGAL_ACCEPTANCE_REQUIRED');
      await request(app.getHttpServer())
        .get('/users/me')
        .auth(token, { type: 'bearer' })
        .expect(200);
      const documents: { id: number }[] = await db.query(
        "SELECT id FROM legal_documents WHERE is_current AND kind<>'ESTABLISHMENT_TERMS'",
      );
      await request(app.getHttpServer())
        .post('/legal/acceptances')
        .auth(token, { type: 'bearer' })
        .send({
          accepted: true,
          document_ids: documents.map((document) => document.id),
          channel: 'mobile',
        })
        .expect(201);
      await request(app.getHttpServer()).get('/cart').auth(token, { type: 'bearer' }).expect(200);
    } finally {
      enforced.mockRestore();
    }
  });

  it('preserves database audit attribution after rollback and clears it for background writes', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    const correlationId = randomUUID();
    const write = (brand: string) =>
      auditRequestContext.run({ user: { id: user.id }, correlationId } as never, () =>
        runner.query('UPDATE products SET brand=$2 WHERE id=$1', [product.id, brand]),
      );
    try {
      await runner.startTransaction();
      await write('rolled-back');
      await runner.rollbackTransaction();
      await runner.query("SELECT set_config('meatshop.actor_id','999999',false)");
      await runner.startTransaction();
      await write('committed');
      await runner.commitTransaction();
      const [audit] = await runner.query(
        "SELECT user_id,actor_type FROM audit_logs WHERE entity='products' AND entity_id=$1 AND correlation_id=$2 ORDER BY id DESC LIMIT 1",
        [String(product.id), correlationId],
      );
      expect(audit).toMatchObject({ user_id: user.id, actor_type: 'USER' });
      await runner.query('UPDATE products SET brand=NULL WHERE id=$1', [product.id]);
      const [background] = await runner.query(
        "SELECT user_id,actor_type FROM audit_logs WHERE entity='products' AND entity_id=$1 ORDER BY id DESC LIMIT 1",
        [String(product.id)],
      );
      expect(background).toMatchObject({ user_id: null, actor_type: 'SYSTEM' });
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('deduplicates durable webhook events and retries failed processing', async () => {
    const queue = app.get(PaymentWebhookQueueService);
    const lifecycle = app.get(PaymentLifecycleService);
    const process = jest
      .spyOn(lifecycle, 'process')
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValue(undefined);
    const paymentId = String(Date.now());
    try {
      await Promise.all([
        queue.enqueue(paymentId, unit.id, null, 'same-event'),
        queue.enqueue(paymentId, unit.id, null, 'same-event'),
      ]);
      const [count] = await db.query(
        'SELECT count(*)::int AS count FROM payment_webhook_events WHERE payment_id=$1',
        [paymentId],
      );
      expect(count.count).toBe(1);
      await queue.processDue();
      const [failed] = await db.query(
        'SELECT status,attempts FROM payment_webhook_events WHERE payment_id=$1',
        [paymentId],
      );
      expect(failed).toMatchObject({ status: 'PENDING', attempts: 1 });
      await db.query(
        'UPDATE payment_webhook_events SET next_attempt_at=now() WHERE payment_id=$1',
        [paymentId],
      );
      await queue.processDue();
      const [done] = await db.query(
        'SELECT status,attempts FROM payment_webhook_events WHERE payment_id=$1',
        [paymentId],
      );
      expect(done).toMatchObject({ status: 'PROCESSED', attempts: 2 });
      expect(process).toHaveBeenCalledWith(paymentId, unit.id);
    } finally {
      process.mockRestore();
    }
  });

  it('uses promotional prices in quote and order items, then expires offline reservations once', async () => {
    await db.getRepository(Promotion).save({
      unit_id: unit.id,
      product_id: product.id,
      created_by: user.id,
      title: 'Promo',
      promotional_price: 40,
      active: true,
      starts_at: new Date(Date.now() - 60000),
      ends_at: new Date(Date.now() + 3600000),
    });
    await request(app.getHttpServer())
      .post('/cart/items')
      .auth(token, { type: 'bearer' })
      .send({ product_id: product.id, quantity: 2 })
      .expect(201);
    const selection = { delivery_type: 'PICKUP', payment_method: 'Cash' };
    const quote = await request(app.getHttpServer())
      .post('/cart/quote')
      .auth(token, { type: 'bearer' })
      .send(selection)
      .expect(201);
    expect(quote.body.total_amount).toBe(80);
    const checkout = await request(app.getHttpServer())
      .post('/orders')
      .auth(token, { type: 'bearer' })
      .set('idempotency-key', randomUUID())
      .send({
        ...selection,
        quote_token: quote.body.quote_token,
        expected_total: 80,
      })
      .expect(201);
    const order = checkout.body.orders[0];
    const [item] = await db.query('SELECT unit_price FROM order_items WHERE order_id=$1', [
      order.id,
    ]);
    expect(Number(item.unit_price)).toBe(40);
    expect(order.delivery_fee).toBe(0);
    expect(order.payment_due_at).toBeTruthy();
    expect(order.delivery_code).toMatch(/^\d{6}$/);
    await db.query("UPDATE orders SET payment_due_at=now()-interval '1 minute' WHERE id=$1", [
      order.id,
    ]);
    await app.get(PaymentLifecycleService).expireReservations();
    await app.get(PaymentLifecycleService).expireReservations();
    const [stock] = await db.query('SELECT quantity FROM stock WHERE product_id=$1', [product.id]);
    expect(Number(stock.quantity)).toBe(10);
  });
  it('completes counter pickup only with the customer code and never assigns a courier', async () => {
    await request(app.getHttpServer())
      .post('/cart/items')
      .auth(token, { type: 'bearer' })
      .send({ product_id: product.id, quantity: 1 })
      .expect(201);
    const selection = { delivery_type: 'PICKUP', payment_method: 'Cash' };
    const quote = await request(app.getHttpServer())
      .post('/cart/quote')
      .auth(token, { type: 'bearer' })
      .send(selection)
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/orders')
      .auth(token, { type: 'bearer' })
      .set('idempotency-key', randomUUID())
      .send({
        ...selection,
        quote_token: quote.body.quote_token,
        expected_total: quote.body.total_amount,
      })
      .expect(201);
    const order = checkout.body.orders[0];
    expect(order.delivery_person_id).toBeNull();
    expect(order.delivery_status).toBeNull();
    await request(app.getHttpServer())
      .patch(`/orders/${order.id}/confirm`)
      .auth(token, { type: 'bearer' })
      .send({})
      .expect(200);
    for (const status of ['PREPARING', 'READY'])
      await request(app.getHttpServer())
        .patch(`/orders/${order.id}/status`)
        .auth(token, { type: 'bearer' })
        .send({ status })
        .expect(200);
    await request(app.getHttpServer())
      .patch(`/orders/${order.id}/status`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'DELIVERED' })
      .expect(400);
    const wrong = order.delivery_code === '000000' ? '111111' : '000000';
    await request(app.getHttpServer())
      .patch(`/orders/${order.id}/status`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'DELIVERED', code: wrong })
      .expect(401);
    const delivered = await request(app.getHttpServer())
      .patch(`/orders/${order.id}/status`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'DELIVERED', code: order.delivery_code })
      .expect(200);
    expect(delivered.body.delivery_code_hash).toBeUndefined();
    expect(delivered.body.status).toBe('DELIVERED');
  });

  it('hides inactive units and products and rejects inactive or closed checkout', async () => {
    await request(app.getHttpServer())
      .post('/cart/items')
      .auth(token, { type: 'bearer' })
      .send({ product_id: product.id, quantity: 1 })
      .expect(201);
    const selection = { delivery_type: 'PICKUP', payment_method: 'Cash' };
    try {
      await request(app.getHttpServer())
        .patch(`/units/${unit.id}/status`)
        .auth(token, { type: 'bearer' })
        .send({ is_active: false })
        .expect(200);
      await request(app.getHttpServer()).get(`/units/${unit.id}`).expect(404);
      await request(app.getHttpServer()).get(`/products/${product.id}`).expect(404);
      const inactive = await request(app.getHttpServer())
        .post('/cart/quote')
        .auth(token, { type: 'bearer' })
        .send(selection)
        .expect(400);
      expect(inactive.body.code).toBe('UNIT_INACTIVE');
      await db.query('UPDATE units SET is_active=true WHERE id=$1', [unit.id]);
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long',
      })
        .format(new Date())
        .toUpperCase() as Weekday;
      await db.getRepository(BusinessHours).save({ unit_id: unit.id, weekday, is_open: false });
      const closed = await request(app.getHttpServer())
        .post('/cart/quote')
        .auth(token, { type: 'bearer' })
        .send(selection)
        .expect(400);
      expect(closed.body.code).toBe('UNIT_CLOSED');
    } finally {
      await db.query('UPDATE units SET is_active=true WHERE id=$1', [unit.id]);
      await db.getRepository(BusinessHours).delete({ unit_id: unit.id });
    }
  });

  it('updates one cart item and returns its siblings, prices and current stock', async () => {
    await request(app.getHttpServer()).delete('/cart').auth(token, { type: 'bearer' }).expect(200);
    const second = await db.getRepository(Product).save({
      name: 'Cart sibling',
      unit_id: unit.id,
      category_id: product.category_id,
      price: 25,
      unit_of_measure: 'KG',
      active: true,
    });
    await db.getRepository(Stock).save({ product_id: second.id, quantity: 3 });
    const [stock] = await db.query('SELECT quantity FROM stock WHERE product_id=$1', [product.id]);
    for (const productId of [product.id, second.id])
      await request(app.getHttpServer())
        .post('/cart/items')
        .auth(token, { type: 'bearer' })
        .send({ product_id: productId, quantity: 1 })
        .expect(201);
    const cart = await request(app.getHttpServer())
      .get('/cart')
      .auth(token, { type: 'bearer' })
      .expect(200);
    const itemId = cart.body.items.find(
      (item: { product_id: number }) => item.product_id === product.id,
    ).id;
    const updated = await request(app.getHttpServer())
      .patch(`/cart/items/${itemId}`)
      .auth(token, { type: 'bearer' })
      .send({ quantity: 2 })
      .expect(200);
    expect(updated.body.items).toHaveLength(2);
    expect(updated.body.total).toBe(125);
    expect(updated.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          product_id: product.id,
          quantity: 2,
          unit_price: 50,
          available_stock: Number(stock.quantity),
        }),
        expect.objectContaining({
          product_id: second.id,
          quantity: 1,
          unit_price: 25,
          available_stock: 3,
        }),
      ]),
    );
  });

  it('never oversells the last item under concurrent checkouts', async () => {
    const other = await db.getRepository(User).save({
      email: `stock-${randomUUID()}@example.test`,
      is_active: true,
      profile_complete: true,
      global_role: GlobalRole.SUPER_ADMIN,
    });
    const tokens = [token, await app.get(JwtService).signAsync({ sub: other.id })];
    const selection = { delivery_type: 'PICKUP', payment_method: 'Cash' };
    await db.getRepository(Stock).update({ product_id: product.id }, { quantity: 1 });
    try {
      const quotes: { quote_token: string; total_amount: number }[] = [];
      for (const currentToken of tokens) {
        await request(app.getHttpServer())
          .delete('/cart')
          .auth(currentToken, { type: 'bearer' })
          .expect(200);
        await request(app.getHttpServer())
          .post('/cart/items')
          .auth(currentToken, { type: 'bearer' })
          .send({ product_id: product.id, quantity: 1 })
          .expect(201);
        quotes.push(
          (
            await request(app.getHttpServer())
              .post('/cart/quote')
              .auth(currentToken, { type: 'bearer' })
              .send(selection)
              .expect(201)
          ).body,
        );
      }
      const ownCart = await request(app.getHttpServer())
        .get('/cart')
        .auth(tokens[0], { type: 'bearer' })
        .expect(200);
      expect(ownCart.body.items[0].available_stock).toBe(1);
      await request(app.getHttpServer())
        .patch(`/cart/items/${ownCart.body.items[0].id}`)
        .auth(tokens[1], { type: 'bearer' })
        .send({ quantity: 1 })
        .expect(404);
      const insufficient = await request(app.getHttpServer())
        .patch(`/cart/items/${ownCart.body.items[0].id}`)
        .auth(tokens[0], { type: 'bearer' })
        .send({ quantity: 2 })
        .expect(400);
      expect(insufficient.body.code).toBe('INSUFFICIENT_STOCK');
      const results = await Promise.all(
        tokens.map((currentToken, index) =>
          request(app.getHttpServer())
            .post('/orders')
            .auth(currentToken, { type: 'bearer' })
            .set('idempotency-key', randomUUID())
            .send({
              ...selection,
              quote_token: quotes[index].quote_token,
              expected_total: quotes[index].total_amount,
            }),
        ),
      );
      expect(results.map((result) => result.status).sort()).toEqual([201, 400]);
      expect(results.find((result) => result.status === 400)!.body.code).toBe('INSUFFICIENT_STOCK');
      const [stock] = await db.query('SELECT quantity FROM stock WHERE product_id=$1', [
        product.id,
      ]);
      expect(Number(stock.quantity)).toBe(0);
      for (const [index, result] of results.entries())
        if (result.status === 201) {
          await request(app.getHttpServer())
            .patch(`/orders/${result.body.orders[0].id}/cancel`)
            .auth(tokens[index], { type: 'bearer' })
            .send({ reason: 'Concurrent test cleanup' })
            .expect(200);
        }
    } finally {
      await db.getRepository(Stock).update({ product_id: product.id }, { quantity: 10 });
    }
  });

  it('preserves the original authentication time and revokes sessions invalidated by Firebase', async () => {
    const linked = await db.getRepository(User).save({
      email: `identity-${randomUUID()}@example.test`,
      firebase_uid: randomUUID(),
      is_active: true,
    });
    const sessions = app.get(AuthSessionService);
    const authenticatedAt = new Date(Date.now() - 60000);
    const original = await sessions.issue(linked, authenticatedAt);
    const identity = jest
      .spyOn(app.get(FirebaseService), 'isSessionCurrent')
      .mockResolvedValue(true);
    try {
      const rotated = await sessions.rotate(original.refresh_token);
      expect(identity).toHaveBeenCalledWith(linked.firebase_uid, authenticatedAt);
      identity.mockRejectedValueOnce(new Error('temporary provider outage'));
      await expect(sessions.rotate(rotated.refresh_token)).rejects.toThrow(
        'temporary provider outage',
      );
      identity.mockResolvedValue(false);
      await expect(sessions.rotate(rotated.refresh_token)).rejects.toMatchObject({
        response: { code: 'IDENTITY_SESSION_REVOKED' },
      });
      expect(identity).toHaveBeenLastCalledWith(linked.firebase_uid, authenticatedAt);
      const [active] = await db.query(
        'SELECT count(*)::int AS count FROM refresh_tokens WHERE user_id=$1 AND revoked=false',
        [linked.id],
      );
      expect(active.count).toBe(0);
    } finally {
      identity.mockRestore();
    }
  });

  it('revokes refresh sessions after logout, password change and password reset', async () => {
    const sessions = app.get(AuthSessionService);
    const signedOut = await sessions.issue(user);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(token, { type: 'bearer' })
      .send({ refresh_token: signedOut.refresh_token })
      .expect(200);
    await expect(sessions.rotate(signedOut.refresh_token)).rejects.toThrow();
    const beforeChange = await sessions.issue(user);
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .auth(token, { type: 'bearer' })
      .send({ current_password: 'Password123!', new_password: 'ChangedPassword123!' })
      .expect(200);
    await expect(sessions.rotate(beforeChange.refresh_token)).rejects.toThrow();
    const beforeReset = await sessions.issue(user);
    const resetToken = randomUUID();
    await db.query(
      "UPDATE users SET password_reset_token=$2,password_reset_expires_at=now()+interval '5 minutes' WHERE id=$1",
      [user.id, resetToken],
    );
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: resetToken, new_password: 'ResetPassword123!' })
      .expect(200);
    await expect(sessions.rotate(beforeReset.refresh_token)).rejects.toThrow();
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: resetToken, new_password: 'ResetPassword123!' })
      .expect(400);
  });

  it('queues earnings updates for the assigned courier on status and settlement changes', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const [courier] = await runner.query(
        "INSERT INTO delivery_persons(user_id,vehicle) VALUES($1,'BIKE') RETURNING id",
        [user.id],
      );
      const [order] = await runner.query(
        'SELECT id FROM orders WHERE client_id=$1 ORDER BY id DESC LIMIT 1',
        [user.id],
      );
      await runner.query(
        "UPDATE orders SET delivery_person_id=$2,status='CANCELLED',delivery_fee=5 WHERE id=$1",
        [order.id, courier.id],
      );
      await runner.query(
        'INSERT INTO delivery_settlements(order_id,delivery_person_id,actor_id,amount,reference) VALUES($1,$2,$3,5,$4)',
        [order.id, courier.id, user.id, 'checklist'],
      );
      const events = await runner.query(
        'SELECT order_id,user_id FROM delivery_earnings_events WHERE order_id=$1',
        [order.id],
      );
      expect(events).toHaveLength(2);
      expect(events).toEqual(expect.arrayContaining([{ order_id: order.id, user_id: user.id }]));
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
