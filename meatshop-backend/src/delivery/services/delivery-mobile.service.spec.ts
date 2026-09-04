import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import type { OrderItem } from '../../orders/entities/order-item.entity';
import type { Order } from '../../orders/entities/order.entity';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import type { UserUnit } from '../../units/entities/user-unit.entity';
import type { User } from '../../users/entities/user.entity';
import type { DeliveryGoal } from '../entities/delivery-goal.entity';
import type { DeliveryOfferRejection } from '../entities/delivery-offer-rejection.entity';
import type { DeliveryPerson } from '../entities/delivery-person.entity';
import type { Vehicle } from '../entities/vehicle.entity';
import { DeliveryAffiliationType } from '../enums/delivery-affiliation-type.enum';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';
import type { DeliveryPersonAccessService } from './delivery-person-access.service';
import { DeliveryMobileService } from './delivery-mobile.service';

describe('DeliveryMobileService', () => {
  const user = { id: 7, name: 'Ana' } as User;
  const access = {
    getOwnDeliveryPerson: jest.fn(),
    getOwnActiveDeliveryPerson: jest.fn(),
    deliveryPersonRepository: { save: jest.fn(), findOne: jest.fn() },
  } as unknown as DeliveryPersonAccessService;
  const vehicles = {
    findOne: jest.fn(),
    find: jest.fn(),
  } as unknown as Repository<Vehicle>;
  const orders = {
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<Order>;
  const items = { find: jest.fn() } as unknown as Repository<OrderItem>;
  const rejections = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  } as unknown as Repository<DeliveryOfferRejection>;
  const goals = {} as Repository<DeliveryGoal>;
  const memberships = { find: jest.fn() } as unknown as Repository<UserUnit>;
  const service = new DeliveryMobileService(
    access,
    vehicles,
    orders,
    items,
    rejections,
    goals,
    memberships,
  );

  function person(affiliation = DeliveryAffiliationType.AUTONOMOUS): DeliveryPerson {
    return {
      id: 3,
      user_id: 7,
      status: DeliveryPersonStatus.ACTIVE,
      affiliation_type: affiliation,
      is_online: true,
      average_rating: 4.8,
      availability_updated_at: null,
    } as DeliveryPerson;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(access.getOwnDeliveryPerson).mockResolvedValue(person());
    jest.mocked(access.getOwnActiveDeliveryPerson).mockResolvedValue(person());
    jest.mocked(access.deliveryPersonRepository.save).mockImplementation(async (value) => value);
    jest.mocked(vehicles.findOne).mockResolvedValue({
      id: 1,
      is_active: true,
      is_enabled: true,
    } as Vehicle);
    jest.mocked(rejections.find).mockResolvedValue([]);
    jest.mocked(items.find).mockResolvedValue([]);
    jest.mocked(orders.find).mockResolvedValue([]);
    jest.mocked(memberships.find).mockResolvedValue([]);
  });

  it('expõe perfil público somente quando o entregador está atribuído ao cliente', async () => {
    jest.mocked(orders.findOne).mockResolvedValue({ id: 22 } as Order);
    jest.mocked(access.deliveryPersonRepository.findOne).mockResolvedValue({
      ...person(),
      user: { name: 'Carlos', avatar_url: '/uploads/avatar.jpg' } as User,
    });
    jest.mocked(vehicles.findOne).mockResolvedValue({
      type: 'MOTORCYCLE',
      model: 'CG 160',
      plate: 'ABC1D23',
      color: 'Preta',
      photo_urls: ['/uploads/vehicle.jpg'],
    } as Vehicle);

    await expect(service.publicProfile(3, user)).resolves.toMatchObject({
      id: 3,
      name: 'Carlos',
      vehicle: { plate: 'ABC1D23' },
    });
  });

  it('não revela perfil de entregador sem pedido do cliente', async () => {
    jest.mocked(orders.findOne).mockResolvedValue(null);
    await expect(service.publicProfile(3, user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('persiste disponibilidade para entregador ativo com veículo ativo', async () => {
    const deliveryPerson = person();
    deliveryPerson.is_online = false;
    jest.mocked(access.getOwnDeliveryPerson).mockResolvedValue(deliveryPerson);

    await service.availability(user, true);

    expect(deliveryPerson.is_online).toBe(true);
    expect(access.deliveryPersonRepository.save).toHaveBeenCalledWith(deliveryPerson);
  });

  it('recusa ficar online sem veículo ativo', async () => {
    jest.mocked(vehicles.findOne).mockResolvedValue(null);
    await expect(service.availability(user, true)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite que autônomo online consulte ofertas de qualquer unidade', async () => {
    await service.available(user);

    expect(orders.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ unit_id: expect.anything() }),
      }),
    );
  });

  it('restringe entregador vinculado às unidades ativas em que possui cargo', async () => {
    jest
      .mocked(access.getOwnActiveDeliveryPerson)
      .mockResolvedValue(person(DeliveryAffiliationType.UNIT));
    jest.mocked(memberships.find).mockResolvedValue([
      {
        unit_id: 12,
        user_id: 7,
        local_role: LocalRole.DELIVERY,
        status: UserUnitStatus.ACTIVE,
      } as UserUnit,
    ]);

    await service.available(user);

    expect(orders.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ unit_id: expect.anything() }),
      }),
    );
  });

  it('impede rejeição de oferta fora da unidade do entregador vinculado', async () => {
    jest
      .mocked(access.getOwnActiveDeliveryPerson)
      .mockResolvedValue(person(DeliveryAffiliationType.UNIT));
    jest.mocked(orders.findOne).mockResolvedValue({
      id: 20,
      unit_id: 99,
      status: OrderStatus.READY,
      delivery_status: DeliveryStatus.WAITING_DELIVERY_PERSON,
    } as Order);

    await expect(service.reject(20, { reasons: ['Distância'] }, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
