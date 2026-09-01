import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import type { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import type { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import type { Unit } from '../../units/entities/unit.entity';
import type { UserUnit } from '../../units/entities/user-unit.entity';
import type { User } from '../../users/entities/user.entity';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';
import { ChatAuthorizationService } from './chat-authorization.service';

describe('ChatAuthorizationService', () => {
  const unitRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Unit>;
  const deliveryPersonRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<DeliveryPerson>;
  const userUnitRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<UserUnit>;

  const service = new ChatAuthorizationService(
    unitRepository,
    deliveryPersonRepository,
    userUnitRepository,
  );

  const order = {
    id: 10,
    client_id: 1,
    unit_id: 2,
    delivery_person_id: 7,
    status: OrderStatus.CONFIRMED,
  } as Order;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(unitRepository.findOne).mockResolvedValue({ id: 2, admin_id: 3 } as Unit);
    jest.mocked(deliveryPersonRepository.findOne).mockResolvedValue({
      id: 7,
      user_id: 4,
    } as DeliveryPerson);
  });

  it('conecta o cliente ao administrador no canal da unidade', async () => {
    await expect(
      service.assertCanParticipate(order, ChatParticipantType.UNIT, {
        id: 1,
      } as User),
    ).resolves.toEqual({ senderId: 1, receiverId: 3 });
  });

  it('permite que um funcionário ativo represente a unidade com a própria identidade', async () => {
    jest.mocked(userUnitRepository.findOne).mockResolvedValue({
      user_id: 5,
      unit_id: 2,
      status: UserUnitStatus.ACTIVE,
      local_role: LocalRole.OPERATOR,
    } as UserUnit);

    await expect(
      service.assertCanParticipate(order, ChatParticipantType.UNIT, {
        id: 5,
      } as User),
    ).resolves.toEqual({ senderId: 5, receiverId: 1 });
  });

  it('impede que um entregador se apresente como equipe da unidade', async () => {
    jest.mocked(userUnitRepository.findOne).mockResolvedValue({
      user_id: 4,
      unit_id: 2,
      status: UserUnitStatus.ACTIVE,
      local_role: LocalRole.DELIVERY,
    } as UserUnit);

    await expect(
      service.assertCanParticipate(order, ChatParticipantType.UNIT, {
        id: 4,
      } as User),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('conecta somente o cliente e o entregador atribuído no canal de entrega', async () => {
    await expect(
      service.assertCanParticipate(order, ChatParticipantType.DELIVERY_PERSON, {
        id: 4,
      } as User),
    ).resolves.toEqual({ senderId: 4, receiverId: 1 });
  });

  it('fecha o envio quando o pedido termina, mantendo a leitura disponível', async () => {
    const deliveredOrder = { ...order, status: OrderStatus.DELIVERED } as Order;
    await expect(
      service.resolveChannelForSending(deliveredOrder, ChatParticipantType.UNIT, { id: 1 } as User),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.assertCanParticipate(deliveredOrder, ChatParticipantType.UNIT, {
        id: 1,
      } as User),
    ).resolves.toEqual({ senderId: 1, receiverId: 3 });
  });
});
