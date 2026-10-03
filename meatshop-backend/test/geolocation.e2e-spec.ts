import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { DeliveryController } from '../src/delivery/delivery.controller';
import { HardenGeolocation1789160000000 } from '../src/database/migrations/1789160000000-HardenGeolocation';
import { beforeEach, afterEach } from '@jest/globals';
import { randomUUID } from 'crypto';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import dataSource from '../src/database/data-source';
import { User } from '../src/users/entities/user.entity';
import { Unit } from '../src/units/entities/unit.entity';
import { UserUnit } from '../src/units/entities/user-unit.entity';
import { Order } from '../src/orders/entities/order.entity';
import { OrderStatus } from '../src/orders/enums/order-status.enum';
import { DeliveryStatus } from '../src/orders/enums/delivery-status.enum';
import { DeliveryPerson } from '../src/delivery/entities/delivery-person.entity';
import { DeliveryTracking } from '../src/delivery/entities/delivery-tracking.entity';
import { DeliveryMode } from '../src/delivery/enums/delivery-mode.enum';
import { DeliveryPersonStatus } from '../src/delivery/enums/delivery-person-status.enum';
import { OrderAuthorizationService } from '../src/orders/services/order-authorization.service';
import { OrderStatusService } from '../src/orders/services/order-status.service';
import { UpdateDeliveryLocationUseCase } from '../src/delivery/use-cases/update-delivery-location.use-case';
import { GetDeliveryTrackingUseCase } from '../src/delivery/use-cases/get-delivery-tracking.use-case';
import { UnitAuthorizationService } from '../src/units/services/unit-authorization.service';
import { UnitPermissionPolicy } from '../src/units/services/unit-permission.policy';
import { OrderStatusHistory } from '../src/orders/entities/order-status-history.entity';

// Opt-in only; never use the development or production database.
const enabled = process.env.GEO_TEST_DATABASE === 'meatshop_geo_test';
(enabled ? describe : describe.skip)('geolocation PostgreSQL invariants', () => {
  let customer: User, courier: User, other: User, unit: Unit, person: DeliveryPerson, order: Order;
  let update: UpdateDeliveryLocationUseCase, get: GetDeliveryTrackingUseCase;
  let session: string;
  let app: INestApplication;
  const jwt = new JwtService({ secret: 'isolated-geolocation-test-secret' });
  const token = (user: User) => jwt.sign({ sub: user.id }, { expiresIn: '5m' });
  const point = () => ({
    latitude: -23.55,
    longitude: -46.63,
    accuracy: 12.345678,
    captured_at: new Date().toISOString(),
    sample_id: randomUUID(),
    session_id: session,
    is_mocked: false,
  });
  beforeAll(async () => {
    dataSource.setOptions({
      host: '127.0.0.1',
      port: 5433,
      username: 'meatshop_user',
      password: 'meatshop_pass',
      database: 'meatshop_geo_test',
      ssl: false,
      logging: false,
    });
    await dataSource.initialize();
    const users = dataSource.getRepository(User);
    [customer, courier, other] = await users.save(
      ['customer', 'courier', 'other'].map((name) =>
        users.create({
          name,
          email: `${name}-${randomUUID()}@geo.invalid`,
          is_active: true,
          profile_complete: true,
        }),
      ),
    );
    unit = await dataSource.getRepository(Unit).save({
      name: 'Geo test',
      cnpj: Date.now().toString(),
      city: 'São Paulo',
      state: 'SP',
      zip_code: '01001000',
      admin_id: customer.id,
    });
    person = await dataSource.getRepository(DeliveryPerson).save({
      user_id: courier.id,
      vehicle: DeliveryMode.BIKE,
      status: DeliveryPersonStatus.ACTIVE,
      is_online: true,
    });
    const units = new UnitAuthorizationService(
      dataSource.getRepository(Unit),
      dataSource.getRepository(UserUnit),
      new UnitPermissionPolicy(),
    );
    const auth = new OrderAuthorizationService(
      dataSource.getRepository(Unit),
      dataSource.getRepository(UserUnit),
      dataSource.getRepository(DeliveryPerson),
    );
    update = new UpdateDeliveryLocationUseCase(
      dataSource.getRepository(Order),
      dataSource.getRepository(DeliveryTracking),
      auth,
      { emitLocation: async () => undefined } as never,
    );
    get = new GetDeliveryTrackingUseCase(
      dataSource.getRepository(Order),
      dataSource.getRepository(DeliveryTracking),
      dataSource.getRepository(DeliveryPerson),
      units,
    );
  });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [DeliveryController],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'isolated-geolocation-test-secret' },
        },
        { provide: getRepositoryToken(User), useValue: dataSource.getRepository(User) },
        { provide: UpdateDeliveryLocationUseCase, useValue: update },
        { provide: GetDeliveryTrackingUseCase, useValue: get },
      ],
    })
      .useMocker(() => ({}))
      .compile();
    app = module.createNestApplication();
    app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });
  it('enforces JWT, ownership and native accuracy through the real HTTP controller', async () => {
    const endpoint = '/delivery/orders/' + order.id;
    await request(app.getHttpServer())
      .get(endpoint + '/tracking')
      .expect(401);
    await request(app.getHttpServer())
      .post(endpoint + '/location')
      .auth(token(courier), { type: 'bearer' })
      .send(point())
      .expect(201);
    const response = await request(app.getHttpServer())
      .get(endpoint + '/tracking')
      .auth(token(customer), { type: 'bearer' })
      .expect(200);
    expect(response.body).toHaveLength(1);
    await request(app.getHttpServer())
      .get(endpoint + '/tracking')
      .auth(token(other), { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .post(endpoint + '/location')
      .auth(token(courier), { type: 'bearer' })
      .send({ ...point(), latitude: '' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(endpoint + '/sharing')
      .auth(token(courier), { type: 'bearer' })
      .send({ enabled: false })
      .expect(200);
    await request(app.getHttpServer())
      .post(endpoint + '/location')
      .auth(token(courier), { type: 'bearer' })
      .send(point())
      .expect(403);
  });
  it('redacts historical coordinates and restores the append-only guard atomically', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const migration = new HardenGeolocation1789160000000();
      await migration.down(runner);
      const [row] = await runner.query(
        `INSERT INTO audit_logs(action,entity,description,new_data) VALUES ('CREATE','tracking','Synthetic privacy test',$1) RETURNING id`,
        [JSON.stringify({ latitude: 0, longitude: 0 })],
      );
      await migration.up(runner);
      const [clean] = await runner.query('SELECT new_data FROM audit_logs WHERE id=$1', [row.id]);
      expect(clean.new_data).toBeNull();
      await runner.query('SAVEPOINT check_guard');
      await expect(
        runner.query('UPDATE audit_logs SET new_data=NULL WHERE id=$1', [row.id]),
      ).rejects.toThrow('append-only');
      await runner.query('ROLLBACK TO SAVEPOINT check_guard');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  beforeEach(async () => {
    order = await dataSource.getRepository(Order).save({
      client_id: customer.id,
      unit_id: unit.id,
      delivery_person_id: person.id,
      status: OrderStatus.READY,
      delivery_status: DeliveryStatus.PICKUP,
      total_amount: 10,
      subtotal: 10,
    });
    session = (await update.sharing(order.id, { enabled: true }, courier)).session_id!;
  });
  afterEach(async () => {
    if (order) {
      await dataSource.getRepository(DeliveryTracking).delete({ order_id: order.id });
      await dataSource.getRepository(OrderStatusHistory).delete({ order_id: order.id });
      await dataSource.getRepository(Order).delete(order.id);
    }
  });
  afterAll(async () => {
    if (app) await app.close();
    if (dataSource.isInitialized) {
      if (person) await dataSource.getRepository(DeliveryPerson).delete(person.id);
      if (unit) await dataSource.getRepository(Unit).delete(unit.id);
      if (customer)
        await dataSource.getRepository(User).delete([customer.id, courier.id, other.id]);
      await dataSource.destroy();
    }
  });
  it('serializes simultaneous writes and stores only one sample', async () => {
    const results = await Promise.allSettled([
      update.execute(order.id, point(), courier),
      update.execute(order.id, point(), courier),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await dataSource.getRepository(DeliveryTracking).countBy({ order_id: order.id })).toBe(
      1,
    );
  });
  it('makes duplicate requests idempotent', async () => {
    const dto = point();
    const results = await Promise.all([
      update.execute(order.id, dto, courier),
      update.execute(order.id, dto, courier),
    ]);
    expect(results[0].id).toBe(results[1].id);
  });
  it('uses the same read policy for the customer and assigned courier', async () => {
    await update.execute(order.id, point(), courier);
    expect(await get.execute(order.id, customer)).toHaveLength(1);
    expect(await get.execute(order.id, courier)).toHaveLength(1);
    await expect(get.execute(order.id, other)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('waits for cancellation holding the order lock and then rejects', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('UPDATE orders SET status=$1 WHERE id=$2', [
        OrderStatus.CANCELLED,
        order.id,
      ]);
      const pending = update.execute(order.id, point(), courier);
      const assertion = expect(pending).rejects.toBeInstanceOf(ConflictException);
      await runner.commitTransaction();
      await assertion;
      expect(await get.execute(order.id, customer)).toEqual([]);
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });
  it('revokes the old session and removes its points before resuming', async () => {
    await update.execute(order.id, point(), courier);
    await update.sharing(order.id, { enabled: false }, courier);
    expect(await get.execute(order.id, customer)).toEqual([]);
    await expect(update.execute(order.id, point(), courier)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const newSession = (await update.sharing(order.id, { enabled: true }, courier)).session_id;
    expect(newSession).not.toBe(session);
    await expect(update.execute(order.id, point(), courier)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('does not restore revoked consent from a stale order during pickup', async () => {
    const stale = await dataSource.getRepository(Order).findOneByOrFail({ id: order.id });
    await update.sharing(order.id, { enabled: false }, courier);
    const transition = new OrderStatusService(
      dataSource.getRepository(Order),
      dataSource.getRepository(OrderStatusHistory),
      { notifyCustomerOfStatusChange: async () => undefined } as never,
    );
    await transition.transition(stale, OrderStatus.OUT_FOR_DELIVERY, courier.id);
    const current = await dataSource
      .getRepository(Order)
      .createQueryBuilder('o')
      .addSelect('o.tracking_session_id')
      .where('o.id=:id', { id: order.id })
      .getOneOrFail();
    expect(current.tracking_revoked_at).not.toBeNull();
    expect(current.tracking_session_id).toBeNull();
  });
});
