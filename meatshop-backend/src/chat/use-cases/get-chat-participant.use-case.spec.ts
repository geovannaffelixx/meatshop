import { describe, it, expect, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Order } from '../../orders/entities/order.entity';
import type { User } from '../../users/entities/user.entity';
import { ChatParticipantType as Channel } from '../enums/chat-participant-type.enum';
import { GetChatParticipantUseCase } from './get-chat-participant.use-case';
import { chatParticipant } from '../services/chat-participant';

const order = {
  id: 42,
  client_id: 7,
  client: { name: 'Cliente', avatar_url: '/uploads/customer.png' },
  unit: { admin_id: 8, name: 'Açougue', image_url: '/uploads/unit.png' },
  delivery_person: {
    user_id: 9,
    user: { name: 'Entregador', avatar_url: 'https://example.com/courier.png' },
  },
} as Order;

describe('Chat participant identity and photos', () => {
  it.each([
    [7, Channel.UNIT, 'UNIT', '/uploads/unit.png'],
    [8, Channel.UNIT, 'CLIENT', '/uploads/customer.png'],
    [7, Channel.DELIVERY_PERSON, 'DELIVERY', 'https://example.com/courier.png'],
    [9, Channel.DELIVERY_PERSON, 'CLIENT', '/uploads/customer.png'],
    [9, Channel.UNIT_DELIVERY_PERSON, 'UNIT', '/uploads/unit.png'],
    [8, Channel.UNIT_DELIVERY_PERSON, 'DELIVERY', 'https://example.com/courier.png'],
  ] as [number, Channel, string, string][])(
    'resolves the correct profile for actor %s in %s',
    (userId, channel, type, url) => {
      expect(chatParticipant(order, channel, userId)).toMatchObject({ type, avatar_url: url });
    },
  );

  it('loads a participant before the first message and returns only public identity fields', async () => {
    const access = {
      assertCanParticipate: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const service = new GetChatParticipantUseCase(
      { findOne: async () => order } as never,
      access as never,
    );
    const profile = await service.execute(42, Channel.UNIT, { id: 7 } as User);
    expect(Object.keys(profile).sort()).toEqual(['avatar_url', 'id', 'name', 'type']);
    expect(profile.avatar_url).toBe('/uploads/unit.png');
    expect(access.assertCanParticipate).toHaveBeenCalled();
  });

  it('rejects unauthorized profile access and missing orders', async () => {
    const access = {
      assertCanParticipate: async () => {
        throw new ForbiddenException();
      },
    };
    const service = new GetChatParticipantUseCase(
      { findOne: async () => order } as never,
      access as never,
    );
    await expect(service.execute(42, Channel.UNIT, { id: 99 } as User)).rejects.toThrow(
      ForbiddenException,
    );
    const missing = new GetChatParticipantUseCase(
      { findOne: async () => null } as never,
      access as never,
    );
    await expect(missing.execute(42, Channel.UNIT, { id: 7 } as User)).rejects.toThrow(
      NotFoundException,
    );
  });
});
