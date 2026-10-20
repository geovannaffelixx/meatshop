import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import type { DeliveryCodeService } from '../../orders/services/delivery-code.service';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Order } from '../../orders/entities/order.entity';
import { Payment } from '../../orders/entities/payment.entity';
import { User } from '../../users/entities/user.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';

function setup() {
  const person = {
    id: 5,
    user_id: 13,
    status: 'ACTIVE',
    is_online: true,
    affiliation_type: 'AUTONOMOUS',
  };
  const order = {
    id: 9,
    unit_id: 4,
    status: 'READY',
    delivery_status: 'WAITING_DELIVERY_PERSON',
    delivery_type: 'DELIVERY',
    payment_status: 'PENDING',
    delivery_person_id: null,
  };
  const records = new Map<unknown, unknown>([
    [DeliveryPerson, person],
    [User, { id: 13, is_active: true }],
    [Vehicle, { id: 5 }],
    [Order, null],
    [Payment, { method: 'Cash' }],
    [UserUnit, { id: 1 }],
  ]);
  const query = {
    addSelect: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(async () => order),
  };
  const manager = {
    findOne: jest.fn(async (entity) => records.get(entity)),
    getRepository: jest.fn(() => ({ createQueryBuilder: () => query })),
    save: jest.fn(async (_entity, value) => value),
  };
  const source = {
    transaction: jest.fn(async (work: (transactionManager: typeof manager) => Promise<unknown>) =>
      work(manager),
    ),
  };
  const codes = { issue: jest.fn(() => '123456') };
  const service = new DeliveryAssignmentService(
    source as unknown as DataSource,
    codes as unknown as DeliveryCodeService,
  );
  return { service, manager, records, person, order, query };
}

describe('DeliveryAssignmentService', () => {
  it('locks the courier and order inside the same transaction before assigning', async () => {
    const { service, manager, query } = setup();
    const result = await service.assign(9, 5);
    expect(manager.findOne).toHaveBeenCalledWith(DeliveryPerson, {
      where: { id: 5 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(query.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(result.order).toMatchObject({ delivery_person_id: 5, delivery_status: 'PICKUP' });
    expect(result.pickupCode).toBe('123456');
  });
  it('rejects a second active delivery before saving another assignment', async () => {
    const { service, records, manager } = setup();
    records.set(Order, { id: 8 });
    await expect(service.assign(9, 5)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('requires the same online status for panel assignments', async () => {
    const { service, person } = setup();
    person.is_online = false;
    await expect(service.assign(9, 5, 4)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('requires an enabled active vehicle', async () => {
    const { service, records } = setup();
    records.set(Vehicle, null);
    await expect(service.assign(9, 5, 4)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects inactive unit membership for panel assignments', async () => {
    const { service, records } = setup();
    records.set(UserUnit, null);
    await expect(service.assign(9, 5, 4)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects orders taken by another courier', async () => {
    const { service, order } = setup();
    Object.assign(order, { delivery_person_id: 99 });
    await expect(service.assign(9, 5)).rejects.toBeInstanceOf(ConflictException);
  });
  it('does not assign an unpaid online order', async () => {
    const { service, records } = setup();
    records.set(Payment, { method: 'Credit Card' });
    await expect(service.assign(9, 5)).rejects.toBeDefined();
  });
});
