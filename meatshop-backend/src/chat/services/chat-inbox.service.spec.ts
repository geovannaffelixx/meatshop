import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import type { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import type { Unit } from '../../units/entities/unit.entity';
import type { UserUnit } from '../../units/entities/user-unit.entity';
import type { User } from '../../users/entities/user.entity';
import type { Chat } from '../entities/chat.entity';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';
import { ChatInboxService } from './chat-inbox.service';

describe('ChatInboxService', () => {
  const messages = { find: jest.fn() } as unknown as Repository<Chat>;
  const orders = { find: jest.fn() } as unknown as Repository<Order>;
  const units = { find: jest.fn() } as unknown as Repository<Unit>;
  const memberships = { find: jest.fn() } as unknown as Repository<UserUnit>;
  const deliveryPeople = {
    findOne: jest.fn(),
  } as unknown as Repository<DeliveryPerson>;
  const service = new ChatInboxService(messages, orders, units, memberships, deliveryPeople);
  const client = { id: 7 } as User;
  const order = {
    id: 42,
    client_id: 7,
    unit_id: 3,
    status: OrderStatus.CONFIRMED,
    client: { id: 7, name: 'Ana', avatar_url: null },
    unit: { id: 3, admin_id: 8, name: 'Unidade Centro' },
    delivery_person: null,
  } as Order;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(units.find).mockResolvedValue([]);
    jest.mocked(memberships.find).mockResolvedValue([]);
    jest.mocked(deliveryPeople.findOne).mockResolvedValue(null);
    jest.mocked(orders.find).mockResolvedValue([order]);
    jest.mocked(messages.find).mockResolvedValue([
      {
        id: 1,
        order_id: 42,
        sender_id: 9,
        receiver_id: 7,
        participant_type: ChatParticipantType.UNIT,
        message: 'Pedido pronto',
        sent_at: new Date('2026-09-03T12:00:00.000Z'),
        read_at: null,
      } as Chat,
    ]);
  });

  it('lista apenas a conversa autorizada e identifica a unidade como interlocutora', async () => {
    const result = await service.list(client, { page: 1, limit: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: '42:UNIT',
      order_id: 42,
      unread_count: 1,
      participant: { id: 8, name: 'Unidade Centro' },
    });
  });

  it('conta não lidas sobre todas as conversas, sem limite da página da caixa', async () => {
    const result = await service.unreadCount(client);
    expect(result).toEqual({ count: 1 });
  });
});
