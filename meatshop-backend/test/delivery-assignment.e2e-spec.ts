import type { LegalPolicyService } from '../src/legal/services/legal-policy.service';
import { Chat } from '../src/chat/entities/chat.entity';
import { ChatParticipantType } from '../src/chat/enums/chat-participant-type.enum';
import { ChatInboxService } from '../src/chat/services/chat-inbox.service';
import { ChatAuthorizationService } from '../src/chat/services/chat-authorization.service';
import { SendMessageUseCase } from '../src/chat/use-cases/send-message.use-case';
import { UserUnit } from '../src/units/entities/user-unit.entity';
import { RegisterDeviceTokenUseCase } from '../src/notifications/use-cases/register-device-token.use-case';
import { UserDeviceToken } from '../src/notifications/entities/user-device-token.entity';
import { jest } from '@jest/globals';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import source from '../src/database/data-source';
import { DeliveryAssignmentService } from '../src/delivery/services/delivery-assignment.service';
import { DeliveryCodeService } from '../src/orders/services/delivery-code.service';
import { User } from '../src/users/entities/user.entity';
import { Unit } from '../src/units/entities/unit.entity';
import { Order } from '../src/orders/entities/order.entity';
import { Payment } from '../src/orders/entities/payment.entity';
import { DeliveryPerson } from '../src/delivery/entities/delivery-person.entity';
import { Vehicle } from '../src/delivery/entities/vehicle.entity';
import { OrderStatus } from '../src/orders/enums/order-status.enum';
import { DeliveryStatus } from '../src/orders/enums/delivery-status.enum';
import { PaymentMethod } from '../src/orders/enums/payment-method.enum';
import { DeliveryMode } from '../src/delivery/enums/delivery-mode.enum';
import { DeliveryPersonStatus } from '../src/delivery/enums/delivery-person-status.enum';
import { VehicleType } from '../src/delivery/enums/vehicle-type.enum';

jest.setTimeout(60000);

describe('Delivery assignment concurrency (PostgreSQL)', () => {
  const schema = `delivery_assignment_test_${randomUUID().replace(/-/g, '')}`;
  const connection = {
    type: 'postgres' as const,
    host: '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5433),
    username: process.env.DB_USERNAME ?? 'meatshop_user',
    password: process.env.DB_PASSWORD ?? 'meatshop_pass',
    database: process.env.DELIVERY_TEST_DATABASE ?? 'meatshop',
    ssl: false as const,
  };
  let admin: DataSource;
  let db: DataSource;
  let service: DeliveryAssignmentService;
  beforeAll(async () => {
    admin = await new DataSource(connection).initialize();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    db = await new DataSource({
      ...connection,
      schema,
      entities: source.options.entities,
      synchronize: true,
    }).initialize();
    service = new DeliveryAssignmentService(
      db,
      new DeliveryCodeService(
        new ConfigService({
          DELIVERY_CODE_SECRET: 'delivery-assignment-test-secret',
          DELIVERY_CODE_ENCRYPTION_KEY: 'delivery-assignment-test-encryption-key',
        }),
        db.getRepository(Order),
      ),
    );
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      if (!/^delivery_assignment_test_[a-f0-9]+$/.test(schema))
        throw new Error('Invalid test schema');
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.destroy();
    }
  });
  async function fixture() {
    const user = await db
      .getRepository(User)
      .save({ email: `courier-${randomUUID()}@example.invalid` });
    const person = await db.getRepository(DeliveryPerson).save({
      user_id: user.id,
      vehicle: DeliveryMode.MOTORCYCLE,
      status: DeliveryPersonStatus.ACTIVE,
      is_online: true,
    });
    await db.getRepository(Vehicle).save({
      delivery_person_id: person.id,
      type: VehicleType.MOTORCYCLE,
      model: 'Test',
      plate: 'TST0000',
      color: 'Black',
      year: 2026,
      is_active: true,
      is_enabled: true,
    });
    const unit = await db.getRepository(Unit).save({
      admin_id: user.id,
      name: 'Test unit',
      cnpj: randomUUID().replace(/-/g, '').slice(0, 14),
      city: 'Recife',
      state: 'PE',
      zip_code: '50000000',
    });
    const orders: Order[] = [];
    for (let index = 0; index < 2; index++) {
      const order = await db.getRepository(Order).save({
        client_id: user.id,
        unit_id: unit.id,
        status: OrderStatus.READY,
        delivery_status: DeliveryStatus.WAITING_DELIVERY_PERSON,
        subtotal: 50,
        total_amount: 50,
      });
      await db.getRepository(Payment).save({ order_id: order.id, method: PaymentMethod.CASH });
      orders.push(order);
    }
    return { person, orders };
  }
  it('allows only one simultaneous assignment to the same courier', async () => {
    const { person, orders } = await fixture();
    const results = await Promise.allSettled(
      orders.map((order) => service.assign(order.id, person.id)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await db.getRepository(Order).countBy({ delivery_person_id: person.id })).toBe(1);
  });
  it('allows only one courier to claim the same order simultaneously', async () => {
    const first = await fixture();
    const second = await fixture();
    const results = await Promise.allSettled([
      service.assign(first.orders[0].id, first.person.id),
      service.assign(first.orders[0].id, second.person.id),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });
  it('registers the same notification token concurrently without duplicate records', async () => {
    const first = await fixture();
    const second = await fixture();
    const service = new RegisterDeviceTokenUseCase(db.getRepository(UserDeviceToken));
    const dto = { fcm_token: `test-token-${randomUUID()}`, platform: 'ANDROID' as const };
    await Promise.all(
      Array.from({ length: 8 }, () => service.execute(dto, { id: first.person.user_id } as User)),
    );
    expect(await db.getRepository(UserDeviceToken).countBy({ fcm_token: dto.fcm_token })).toBe(1);
    await service.execute(dto, { id: second.person.user_id } as User);
    expect(
      await db.getRepository(UserDeviceToken).findOneBy({ fcm_token: dto.fcm_token }),
    ).toMatchObject({ user_id: second.person.user_id });
  });
  it('persists all three chat channels with correct names and isolates the active profile', async () => {
    const { person, orders } = await fixture();
    const customer = await db
      .getRepository(User)
      .save({ email: `client-${randomUUID()}@example.invalid`, name: 'Ana Cliente' });
    const owner = await db
      .getRepository(User)
      .save({ email: `owner-${randomUUID()}@example.invalid`, name: 'Carla Unidade' });
    await db.getRepository(User).update(person.user_id, { name: 'Rafael Entregador' });
    await db
      .getRepository(Unit)
      .update(orders[0].unit_id, { admin_id: owner.id, name: 'Açougue Central' });
    await db
      .getRepository(Order)
      .update(orders[0].id, { client_id: customer.id, delivery_person_id: person.id });
    const courier = await db.getRepository(User).findOneByOrFail({ id: person.user_id });
    const authorization = new ChatAuthorizationService(
      { assertUser: async () => undefined } as unknown as LegalPolicyService,
      db.getRepository(Unit),
      db.getRepository(DeliveryPerson),
      db.getRepository(UserUnit),
    );
    const sender = new SendMessageUseCase(
      db.getRepository(Chat),
      db.getRepository(Order),
      authorization,
      { execute: async () => undefined } as never,
    );
    const first = await sender.execute(
      orders[0].id,
      { participant_type: ChatParticipantType.UNIT, message: 'Olá, açougue!' },
      customer,
    );
    expect(first.sender_name).toBe('Ana Cliente');
    await sender.execute(
      orders[0].id,
      { participant_type: ChatParticipantType.DELIVERY_PERSON, message: 'Olá, cliente!' },
      courier,
    );
    await sender.execute(
      orders[0].id,
      { participant_type: ChatParticipantType.UNIT_DELIVERY_PERSON, message: 'Olá, entregador!' },
      owner,
    );
    const inbox = new ChatInboxService(
      db.getRepository(Chat),
      db.getRepository(Order),
      db.getRepository(Unit),
      db.getRepository(UserUnit),
      db.getRepository(DeliveryPerson),
    );
    const clientChats = await inbox.list(customer, { profile: 'CLIENT' });
    expect(clientChats.items.map((item) => item.participant.name).sort()).toEqual(
      ['Açougue Central', 'Rafael Entregador'].sort(),
    );
    const courierChats = await inbox.list(courier, { profile: 'DELIVERY' });
    expect(courierChats.items.map((item) => item.participant.name).sort()).toEqual(
      ['Açougue Central', 'Ana Cliente'].sort(),
    );
    expect((await inbox.list(courier, { profile: 'CLIENT' })).items).toHaveLength(0);
    await expect(
      sender.execute(
        orders[0].id,
        { participant_type: ChatParticipantType.DELIVERY_PERSON, message: 'Acesso indevido' },
        owner,
      ),
    ).rejects.toThrow();
  });
});
