import { CompleteFunctionalGaps1792790400000 } from '../src/database/migrations/1792790400000-CompleteFunctionalGaps';
import 'reflect-metadata';
import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import source from '../src/database/data-source';
import { NotificationPreferences1792288801000 } from '../src/database/migrations/1792288801000-NotificationPreferences';
import { UnitSchedulingCapacity1792288802000 } from '../src/database/migrations/1792288802000-UnitSchedulingCapacity';
import { FunctionalGapsHardening1792288803000 } from '../src/database/migrations/1792288803000-FunctionalGapsHardening';
import { User } from '../src/users/entities/user.entity';
import { Unit } from '../src/units/entities/unit.entity';
import { BusinessHours } from '../src/units/entities/business-hours.entity';
import type { Weekday } from '../src/units/enums/weekday.enum';
import { Order } from '../src/orders/entities/order.entity';
import { OrderStatus } from '../src/orders/enums/order-status.enum';
import { Payment } from '../src/orders/entities/payment.entity';
import { PaymentStatus } from '../src/orders/enums/payment-status.enum';
import { PaymentMethod } from '../src/orders/enums/payment-method.enum';
import { Product } from '../src/products/entities/product.entity';
import { Category } from '../src/categories/entities/category.entity';
import { Stock } from '../src/products/entities/stock.entity';
import { Promotion } from '../src/promotions/entities/promotion.entity';
import { NotificationPreference } from '../src/notifications/entities/notification-preference.entity';
import { SchedulingAvailabilityService } from '../src/orders/services/scheduling-availability.service';
import { SetBusinessHoursUseCase } from '../src/units/use-cases/set-business-hours.use-case';
import { MarketplaceSearchService } from '../src/search/marketplace-search.service';
import { SendPromotionNotificationUseCase } from '../src/notifications/use-cases/send-promotion-notification.use-case';

// Prepare an empty schema copy of the development DB, never a data copy.
const enabled = process.env.GAPS_TEST_DATABASE === 'meatshop_gaps_test_330';
(enabled ? describe : describe.skip)('functional gaps with isolated PostgreSQL', () => {
  let db: DataSource;
  let user: User;
  let unit: Unit;
  let product: Product;
  let category: Category;
  let scheduling: SchedulingAvailabilityService;
  const date = '2099-10-21';
  const startsAt = new Date(`${date}T10:00:00-03:00`);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
  })
    .format(startsAt)
    .toUpperCase() as Weekday;

  beforeAll(async () => {
    db = new DataSource({
      type: 'postgres',
      entities: source.options.entities,
      host: '127.0.0.1',
      port: Number(process.env.E2E_DB_PORT ?? 5433),
      username: 'meatshop_user',
      password: 'meatshop_pass',
      database: 'meatshop_gaps_test_330',
      ssl: false,
      logging: false,
      synchronize: false,
      migrations: [],
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    // Verify the branch migrations against the schema before these features existed.
    if (await runner.hasTable('auth_login_attempts'))
      await new CompleteFunctionalGaps1792790400000().down(runner);
    if (await runner.hasColumn('promotions', 'notification_sent_at')) {
      await new FunctionalGapsHardening1792288803000().down(runner);
    }
    await new NotificationPreferences1792288801000().down(runner);
    await new UnitSchedulingCapacity1792288802000().down(runner);
    await new NotificationPreferences1792288801000().up(runner);
    await new UnitSchedulingCapacity1792288802000().up(runner);
    await new FunctionalGapsHardening1792288803000().up(runner);
    await new CompleteFunctionalGaps1792790400000().up(runner);
    await runner.release();
    user = await db
      .getRepository(User)
      .save({ email: `gaps-${randomUUID()}@example.invalid`, name: 'Gaps test', is_active: true });
    unit = await db.getRepository(Unit).save({
      name: 'Isolated gaps test',
      cnpj: randomUUID().replace(/-/g, '').slice(0, 14),
      city: 'Anapolis',
      state: 'GO',
      zip_code: '75020010',
      admin_id: user.id,
      scheduling_slot_minutes: 30,
      scheduling_capacity: 1,
    });
    await db.getRepository(BusinessHours).save({
      unit_id: unit.id,
      weekday,
      is_open: true,
      opening_time: '08:00',
      closing_time: '18:00',
    });
    category = await db
      .getRepository(Category)
      .save({ unit_id: unit.id, name: 'Bovinos', active: true });
    product = await db.getRepository(Product).save({
      unit_id: unit.id,
      category_id: category.id,
      name: 'Picanha',
      brand: 'Swift',
      price: 80,
      active: true,
      unit_of_measure: 'kg',
    });
    await db.getRepository(Stock).save({ product_id: product.id, quantity: 10, min_quantity: 1 });
    scheduling = new SchedulingAvailabilityService(
      db.getRepository(Unit),
      db.getRepository(BusinessHours),
      db.getRepository(Order),
    );
  }, 30000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    if (unit) {
      await db.query(
        'DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE unit_id=$1)',
        [unit.id],
      );
      await db.getRepository(Order).delete({ unit_id: unit.id });
      await db.getRepository(Promotion).delete({ unit_id: unit.id });
      await db.getRepository(Product).delete({ unit_id: unit.id });
      await db.getRepository(Category).delete({ unit_id: unit.id });
      await db.getRepository(Unit).delete(unit.id);
    }
    if (user) await db.getRepository(User).delete(user.id);
    await db.destroy();
  });

  it('serializes the last scheduling place across real concurrent transactions', async () => {
    const reserve = () =>
      db.transaction(async (manager) => {
        await scheduling.assertAvailable(unit.id, startsAt, manager);
        await manager.query('SELECT pg_sleep(0.1)');
        return manager.getRepository(Order).save({
          unit_id: unit.id,
          client_id: user.id,
          total_amount: 80,
          subtotal: 80,
          is_scheduled: true,
          scheduled_delivery_date: startsAt,
        });
      });
    const results = await Promise.allSettled([reserve(), reserve()]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(
      (await scheduling.listAvailable([unit.id], date)).some((slot) => slot.time === '10:00'),
    ).toBe(false);
    await db.getRepository(Order).update({ unit_id: unit.id }, { status: OrderStatus.CANCELLED });
    expect(
      (await scheduling.listAvailable([unit.id], date)).some((slot) => slot.time === '10:00'),
    ).toBe(true);
  });

  it('enforces complete scheduling configuration at the database boundary', async () => {
    await expect(
      db.query('UPDATE units SET scheduling_capacity=NULL WHERE id=$1', [unit.id]),
    ).rejects.toThrow();
    expect(
      (await db.getRepository(Unit).findOneByOrFail({ id: unit.id })).scheduling_capacity,
    ).toBe(1);
  });

  it('rolls capacity back when the business-hours write fails', async () => {
    const service = new SetBusinessHoursUseCase(
      db.getRepository(BusinessHours),
      db.getRepository(Unit),
      { assertCanManageUnit: async () => undefined } as never,
    );
    await expect(
      service.execute(
        unit.id,
        {
          scheduling_slot_minutes: 60,
          scheduling_capacity: 2,
          days: [{ weekday: 'INVALID' as Weekday, is_open: false }],
        },
        user,
      ),
    ).rejects.toThrow();
    const persisted = await db.getRepository(Unit).findOneByOrFail({ id: unit.id });
    expect(persisted.scheduling_slot_minutes).toBe(30);
    expect(persisted.scheduling_capacity).toBe(1);
  });

  it('executes filter-only search in SQL and hides unavailable stock', async () => {
    const search = new MarketplaceSearchService(
      db.getRepository(Unit),
      db.getRepository(Category),
      db.getRepository(Product),
    );
    const filters = {
      unit_id: unit.id,
      brand: 'sWiFt',
      min_price: 80,
      max_price: 80,
      page: 1,
      limit: 20,
    };
    expect((await search.execute(filters)).data).toHaveLength(1);
    await db.getRepository(Stock).update({ product_id: product.id }, { quantity: 0 });
    expect((await search.execute(filters)).data).toHaveLength(0);
    expect(await search.listBrands({ unit_id: unit.id })).toEqual([]);
    await db.getRepository(Stock).update({ product_id: product.id }, { quantity: 10 });
  });

  it('claims promotion once and includes a buyer without a preference row', async () => {
    await db.transaction(async (manager) => {
      const order = await manager.getRepository(Order).save({
        unit_id: unit.id,
        client_id: user.id,
        total_amount: 80,
        subtotal: 80,
        status: OrderStatus.DELIVERED,
        payment_status: PaymentStatus.PAID,
      });
      await manager.getRepository(Payment).save({
        order_id: order.id,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        payment_date: new Date(),
      });
    });
    const promotion = await db.getRepository(Promotion).save({
      unit_id: unit.id,
      product_id: product.id,
      created_by: user.id,
      title: 'Isolated campaign',
      active: true,
      discount_percentage: 10,
      starts_at: new Date(Date.now() - 60000),
      ends_at: new Date(Date.now() + 60000),
    });
    const notifier = { execute: jest.fn(async () => ({})) };
    const service = new SendPromotionNotificationUseCase(
      db.getRepository(User),
      notifier as never,
      db.getRepository(Promotion),
    );
    const results = await Promise.all([service.execute(promotion), service.execute(promotion)]);
    expect(results.reduce((sum, value) => sum + value, 0)).toBe(1);
    expect(notifier.execute).toHaveBeenCalledTimes(1);
    await db
      .getRepository(NotificationPreference)
      .save({ user_id: user.id, promotions_enabled: false });
    const other = await db
      .getRepository(Promotion)
      .save({ ...promotion, id: undefined, title: 'Opt-out campaign', notification_sent_at: null });
    expect(await service.execute(other)).toBe(0);
    expect(notifier.execute).toHaveBeenCalledTimes(1);
  });

  it('waits until a future promotion starts and sends it once through the scheduler', async () => {
    await db
      .getRepository(NotificationPreference)
      .update({ user_id: user.id }, { promotions_enabled: true });
    const promotion = await db.getRepository(Promotion).save({
      unit_id: unit.id,
      product_id: product.id,
      created_by: user.id,
      title: 'Future campaign',
      active: true,
      discount_percentage: 10,
      starts_at: new Date(Date.now() + 60000),
      ends_at: new Date(Date.now() + 120000),
    });
    const notifier = { execute: jest.fn(async () => ({})) };
    const service = new SendPromotionNotificationUseCase(
      db.getRepository(User),
      notifier as never,
      db.getRepository(Promotion),
    );
    expect(await service.execute(promotion)).toBe(0);
    expect(notifier.execute).not.toHaveBeenCalled();
    await db
      .getRepository(Promotion)
      .update(promotion.id, { starts_at: new Date(Date.now() - 60000) });
    await service.sendDue();
    await service.sendDue();
    expect(notifier.execute).toHaveBeenCalledTimes(1);
  });
});
