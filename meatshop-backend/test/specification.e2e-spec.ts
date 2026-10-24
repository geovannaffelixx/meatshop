import { CompleteFunctionalGaps1792790400000 } from '../src/database/migrations/1792790400000-CompleteFunctionalGaps';
import legalDocuments from '../src/legal/data/documents-2026-10-18.json';
import { setInterval, clearInterval, setTimeout, clearTimeout } from 'node:timers';
import { mkdir, writeFile } from 'node:fs/promises';
import { PersonalDataRetentionService } from '../src/users/services/personal-data-retention.service';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { PostgresIoAdapter } from '../src/common/adapters/postgres-io.adapter';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Unit } from '../src/units/entities/unit.entity';
import { Category } from '../src/categories/entities/category.entity';
import { Product } from '../src/products/entities/product.entity';
import { Stock } from '../src/products/entities/stock.entity';
import { GlobalRole } from '../src/common/enums/global-role.enum';
import { SendNotificationUseCase } from '../src/notifications/use-cases/send-notification.use-case';
import { SendOrderStatusNotificationUseCase } from '../src/notifications/use-cases/send-order-status-notification.use-case';
import { VerifyMobilePasswordUseCase } from '../src/auth/use-cases/verify-mobile-password.use-case';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

const enabled = ['meatshop_spec_test_330', 'meatshop_gaps_test_330'].includes(
  process.env.E2E_TEST_DATABASE ?? '',
);
(enabled ? describe : describe.skip)('Specification regression with isolated PostgreSQL', () => {
  let app: INestApplication;
  let db: DataSource;
  let alice: User;
  let bob: User;
  let aliceToken: string;
  let bobToken: string;
  let unit: Unit;
  let category: Category;
  let product: Product;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SendNotificationUseCase)
      .useValue({ execute: async () => ({}) })
      .overrideProvider(SendOrderStatusNotificationUseCase)
      .useValue({
        notifyUnitOfNewOrder: async () => undefined,
        notifyCustomerOfDeliveryCode: async () => undefined,
        notifyCustomerOfStatusChange: async () => undefined,
        execute: async () => undefined,
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(app.get(AllExceptionsFilter));
    await app.listen(0, '127.0.0.1');
    db = app.get(DataSource);
    if (!['meatshop_spec_test_330', 'meatshop_gaps_test_330'].includes(String(db.options.database)))
      throw new Error('Unsafe test database');
    const migrationRunner = db.createQueryRunner();
    await new CompleteFunctionalGaps1792790400000().ensureAuditCoverage(migrationRunner);
    await migrationRunner.release();
    for (const document of legalDocuments) {
      await db.query(
        `INSERT INTO legal_documents(kind,version,title,content,content_hash,published_at)
         SELECT $1::varchar(40),$2,$3,$4,$5,$6 WHERE NOT EXISTS
         (SELECT 1 FROM legal_documents WHERE kind=$1::varchar(40) AND is_current=true)`,
        [
          document.kind,
          document.version,
          document.title,
          document.content,
          document.content_hash,
          document.published_at,
        ],
      );
    }
    const users = db.getRepository(User);
    alice = await users.save({
      email: `alice-${randomUUID()}@example.invalid`,
      name: 'Alice specification',
      password_hash: 'private-hash',
      global_role: GlobalRole.SUPER_ADMIN,
      profile_complete: true,
      is_active: true,
    });
    bob = await users.save({
      email: `bob-${randomUUID()}@example.invalid`,
      name: 'Bob specification',
      global_role: GlobalRole.USER,
      profile_complete: true,
      is_active: true,
    });
    await db.query(
      "INSERT INTO legal_acceptances(user_id,document_id,channel) SELECT u.id,d.id,'mobile' FROM users u CROSS JOIN legal_documents d WHERE u.id=ANY($1::int[]) AND d.is_current=true",
      [[alice.id, bob.id]],
    );
    aliceToken = await app.get(JwtService).signAsync({ sub: alice.id });
    bobToken = await app.get(JwtService).signAsync({ sub: bob.id });
    await db.query(
      "INSERT INTO delivery_persons(user_id,vehicle,status) VALUES($1,'MOTORCYCLE','ACTIVE'),($2,'MOTORCYCLE','ACTIVE')",
      [alice.id, bob.id],
    );
    unit = await db.getRepository(Unit).save({
      admin_id: alice.id,
      name: 'Specification unit',
      cnpj: randomUUID().replace(/-/g, '').slice(0, 14),
      city: 'Anapolis',
      state: 'GO',
      zip_code: '75000000',
      neighborhood: 'Centro',
    });
    category = await db
      .getRepository(Category)
      .save({ name: 'Specification beef', unit_id: unit.id, active: true });
    product = await db.getRepository(Product).save({
      name: `spec-${randomUUID()}`,
      unit_id: unit.id,
      category_id: category.id,
      active: true,
      price: 10,
      unit_of_measure: 'UN',
    });
    await db.getRepository(Stock).save({ product_id: product.id, quantity: 100, min_quantity: 0 });
  }, 60000);
  afterAll(async () => {
    if (db?.isInitialized && alice && bob)
      await db.query('UPDATE users SET is_active=false WHERE id=ANY($1::int[])', [
        [alice.id, bob.id],
      ]);
    await app?.close();
  });

  it('hides inactive products publicly while preserving authorized management access', async () => {
    await db.getRepository(Product).update(product.id, { active: false });
    await request(app.getHttpServer()).get(`/products/${product.id}`).expect(404);
    const response = await request(app.getHttpServer())
      .get(`/products?unit_id=${unit.id}&available=false&active=false`)
      .expect(200);
    expect(response.body.data).toEqual([]);
    await request(app.getHttpServer())
      .get(`/products/manage/${product.id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/products/manage/${product.id}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(403);
    await request(app.getHttpServer()).get(`/products/manage/${product.id}`).expect(401);
    await db.getRepository(Product).update(product.id, { active: true });
  });

  it('filters city and region without requesting coordinates', async () => {
    const result = await request(app.getHttpServer())
      .get('/units')
      .query({ city: 'Anápolis', region: 'Centro' })
      .expect(200);
    expect(result.body.data.some((row: { id: number }) => row.id === unit.id)).toBe(true);
    const missing = await request(app.getHttpServer())
      .get('/units?city=NonexistentSpecificationCity')
      .expect(200);
    expect(missing.body.data).toEqual([]);
  });

  it('isolates expenses by owner, validates amounts, and recalculates totals', async () => {
    const body = {
      category: 'FUEL',
      description: 'Dedicated test fuel',
      amount: 12.5,
      incurred_on: '2026-10-01',
    };
    const created = await request(app.getHttpServer())
      .post('/delivery/expenses')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send(body)
      .expect(201);
    const id = created.body.id;
    await request(app.getHttpServer())
      .patch(`/delivery/expenses/${id}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ ...body, amount: 99 })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/delivery/expenses/${id}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post('/delivery/expenses')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ ...body, amount: -1 })
      .expect(400);
    const list = await request(app.getHttpServer())
      .get('/delivery/expenses?from=2026-10-01&to=2026-10-31')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
    expect(list.body.total_amount).toBe('12.50');
    await request(app.getHttpServer())
      .delete(`/delivery/expenses/${id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
  });

  it('exports only the authenticated users records without session or password secrets', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/me/export')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data.profile[0].email).toBe(alice.email);
    expect(JSON.stringify(response.body)).not.toContain(bob.email);
    expect(JSON.stringify(response.body)).not.toContain('private-hash');
    await request(app.getHttpServer()).get('/users/me/export').expect(401);
  });

  it('preserves support conversation and rejects access by another customer', async () => {
    const created = await request(app.getHttpServer())
      .post('/support-tickets')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ subject: 'Specification support', description: 'Need help', category: 'TECHNICAL' })
      .expect(201);
    const id = created.body.id;
    await request(app.getHttpServer())
      .post(`/support-tickets/${id}/messages`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ message: 'Still waiting' })
      .expect(201);
    const conversation = await request(app.getHttpServer())
      .get(`/support-tickets/${id}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);
    expect(
      conversation.body.messages.some(
        (row: { message: string }) => row.message === 'Still waiting',
      ),
    ).toBe(true);
    const outsider = await db.getRepository(User).save({
      email: `outsider-${randomUUID()}@example.invalid`,
      profile_complete: true,
      is_active: true,
    });
    const outsiderToken = await app.get(JwtService).signAsync({ sub: outsider.id });
    await request(app.getHttpServer())
      .get(`/support-tickets/${id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
    await db.getRepository(User).update(outsider.id, { is_active: false });
    await request(app.getHttpServer())
      .patch(`/support-tickets/${id}/close`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/support-tickets/${id}/messages`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ message: 'Closed' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/support-tickets/${id}/reopen`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);
  });

  it('records database changes transactionally and rejects audit mutation and truncation', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('UPDATE products SET price=11 WHERE id=$1', [product.id]);
      const rows = await runner.query(
        "SELECT id FROM audit_logs WHERE entity='products' AND entity_id=$1 AND correlation_id=txid_current()::text",
        [String(product.id)],
      );
      expect(rows.length).toBe(1);
      await runner.query('SAVEPOINT audit_guard');
      await expect(
        runner.query('DELETE FROM audit_logs WHERE id=$1', [rows[0].id]),
      ).rejects.toThrow('append-only');
      await runner.query('ROLLBACK TO SAVEPOINT audit_guard');
      await expect(runner.query('TRUNCATE audit_logs')).rejects.toThrow('append-only');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
    expect(
      Number((await db.getRepository(Product).findOneByOrFail({ id: product.id })).price),
    ).toBe(10);
  });

  it('rolls back a critical change when its transactional audit cannot be inserted', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        'ALTER TABLE audit_logs ADD CONSTRAINT specification_reject_audit CHECK(false) NOT VALID',
      );
      await expect(
        runner.query('UPDATE products SET price=999 WHERE id=$1', [product.id]),
      ).rejects.toThrow('specification_reject_audit');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
    expect(
      Number((await db.getRepository(Product).findOneByOrFail({ id: product.id })).price),
    ).toBe(10);
  });

  it('expires old authentication metadata without deleting active locks or financial history', async () => {
    const expired = randomUUID().replace(/-/g, '');
    const active = randomUUID().replace(/-/g, '');
    await db.query(
      "INSERT INTO auth_login_attempts(identity_hash,updated_at,locked_until) VALUES($1,now()-interval '40 days',NULL),($2,now()-interval '40 days',now()+interval '15 minutes')",
      [expired, active],
    );
    const [before] = await db.query('SELECT COUNT(*)::int AS count FROM orders');
    await app.get(PersonalDataRetentionService).run();
    expect(
      (
        await db.query('SELECT identity_hash FROM auth_login_attempts WHERE identity_hash=$1', [
          expired,
        ])
      ).length,
    ).toBe(0);
    expect(
      (
        await db.query('SELECT identity_hash FROM auth_login_attempts WHERE identity_hash=$1', [
          active,
        ])
      ).length,
    ).toBe(1);
    const [after] = await db.query('SELECT COUNT(*)::int AS count FROM orders');
    expect(after.count).toBe(before.count);
  });

  it('executes concurrent search, cart and checkout journeys with dedicated accounts', async () => {
    const run = promisify(execFile);
    const { stdout } = await run(
      process.execPath,
      [resolve(__dirname, '../../scripts/performance-journeys.mjs')],
      {
        env: {
          ...process.env,
          PERF_BASE_URL: await app.getUrl(),
          PERF_ALLOW_MUTATIONS: 'true',
          PERF_ITERATIONS: '3',
          PERF_SEARCH_TERM: product.name,
          PERF_ACCOUNTS: JSON.stringify([
            { token: aliceToken, productId: product.id },
            { token: bobToken, productId: product.id },
          ]),
        },
        timeout: 30000,
      },
    );
    await mkdir(resolve(process.cwd(), 'test-results'), { recursive: true });
    await writeFile(resolve(process.cwd(), 'test-results/specification-performance.json'), stdout);
    const report = JSON.parse(stdout);
    expect(report.search.count).toBe(6);
    expect(report.checkout.count).toBe(6);
    expect(
      Number((await db.getRepository(Stock).findOneByOrFail({ product_id: product.id })).quantity),
    ).toBe(100);
  }, 40000);

  it('does not repeat products whose category was disabled after the purchase', async () => {
    const [order] = await db.query(
      'SELECT id FROM orders WHERE client_id=$1 ORDER BY id DESC LIMIT 1',
      [bob.id],
    );
    expect(order).toBeDefined();
    await db.getRepository(Category).update(category.id, { active: false });
    try {
      await request(app.getHttpServer())
        .post(`/orders/${order.id}/repeat`)
        .set('Authorization', `Bearer ${bobToken}`)
        .expect(400);
      const cart = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${bobToken}`)
        .expect(200);
      expect(cart.body.items).toEqual([]);
    } finally {
      await db.getRepository(Category).update(category.id, { active: true });
    }
  });

  it('distributes room events between two server instances through PostgreSQL', async () => {
    const httpA = createServer();
    const httpB = createServer();
    const adapterA = new PostgresIoAdapter(
      { get: () => db, getHttpServer: () => httpA } as never,
      httpA,
    );
    const adapterB = new PostgresIoAdapter(
      { get: () => db, getHttpServer: () => httpB } as never,
      httpB,
    );
    await Promise.all([adapterA.initialize(), adapterB.initialize()]);
    const ioA = adapterA.createIOServer(0, { transports: ['websocket'] } as never);
    const ioB = adapterB.createIOServer(0, { transports: ['websocket'] } as never);
    const room = `isolated-${randomUUID()}`;
    ioB.on('connection', (socket) => {
      void socket.join(room);
    });
    await Promise.all([
      new Promise<void>((resolve) => httpA.listen(0, '127.0.0.1', resolve)),
      new Promise<void>((resolve) => httpB.listen(0, '127.0.0.1', resolve)),
    ]);
    const socket = new globalThis.WebSocket(
      `ws://127.0.0.1:${(httpB.address() as AddressInfo).port}/socket.io/?EIO=4&transport=websocket`,
    );
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Cross-instance event not received')),
          5000,
        );
        socket.addEventListener('message', (event) => {
          const packet = String(event.data);
          if (packet.startsWith('0')) socket.send('40');
          if (packet.startsWith('40'))
            timer = setInterval(() => ioA.to(room).emit('specification:shared', { value: 1 }), 100);
          if (packet.startsWith('42') && packet.includes('specification:shared')) {
            clearTimeout(timeout);
            resolve();
          }
        });
        socket.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed'));
        });
      });
    } finally {
      if (timer) clearInterval(timer);
      socket.close();
      await Promise.all([
        new Promise<void>((resolve) => ioA.close(() => resolve())),
        new Promise<void>((resolve) => ioB.close(() => resolve())),
      ]);
      await Promise.all([adapterA.dispose(), adapterB.dispose()]);
    }
  });

  it('counts concurrent failures across service instances and blocks before another provider request', async () => {
    const email = `lock-${randomUUID()}@example.invalid`;
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }),
    } as Response);
    try {
      const config = { get: () => 'public-test-api-key' };
      const first = new VerifyMobilePasswordUseCase(db, config as never);
      const second = new VerifyMobilePasswordUseCase(db, config as never);
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, (_, index) =>
          (index % 2 ? first : second).execute(email, 'invalid-password'),
        ),
      );
      expect(results.every((result) => result.status === 'rejected')).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(5);
      await expect(first.execute(email, 'invalid-password')).rejects.toThrow('Muitas tentativas');
      expect(fetch).toHaveBeenCalledTimes(5);
    } finally {
      fetch.mockRestore();
    }
  });
});
