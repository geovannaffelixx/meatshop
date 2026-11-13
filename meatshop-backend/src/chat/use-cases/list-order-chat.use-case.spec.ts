import { describe, it, expect, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { LessThan } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Order } from '../../orders/entities/order.entity';
import type { User } from '../../users/entities/user.entity';
import type { Chat } from '../entities/chat.entity';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';
import { ListChatMessagesDto } from '../dtos/list-chat-messages.dto';
import type { ChatAuthorizationService } from '../services/chat-authorization.service';
import { ListOrderChatUseCase } from './list-order-chat.use-case';

function setup() {
  const find = jest.fn<Repository<Chat>['find']>();
  const findOne = jest.fn<Repository<Order>['findOne']>().mockResolvedValue({ id: 9 } as Order);
  const assertCanParticipate = jest
    .fn<ChatAuthorizationService['assertCanParticipate']>()
    .mockResolvedValue({ senderId: 3, receiverId: 2 });
  const service = new ListOrderChatUseCase(
    { find } as unknown as Repository<Chat>,
    { findOne } as unknown as Repository<Order>,
    { assertCanParticipate } as unknown as ChatAuthorizationService,
  );
  return { service, find, assertCanParticipate };
}
const user = { id: 3 } as User;
const channel = ChatParticipantType.UNIT;
const rows = (...ids: number[]) =>
  ids.map((id) => ({ id, order_id: 9, participant_type: channel }) as Chat);

describe('Order chat pagination', () => {
  it('returns a bounded chronological batch and an exclusive cursor', async () => {
    const { service, find } = setup();
    find.mockResolvedValueOnce(rows(8, 7, 6));
    const first = await service.execute(
      9,
      { participant_type: channel, paginated: 'true', limit: 2 },
      user,
    );
    expect(first).toMatchObject({
      items: [{ id: 7 }, { id: 8 }],
      has_more: true,
      next_before_id: 7,
    });
    // A new message arriving after the initial fetch cannot shift the cursor boundary.
    find.mockResolvedValueOnce(rows(6, 5));
    const second = await service.execute(
      9,
      { participant_type: channel, paginated: 'true', limit: 2, before_id: 7 },
      user,
    );
    expect(find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { order_id: 9, participant_type: channel, id: LessThan(7) },
        skip: 0,
        take: 3,
      }),
    );
    expect(second).toMatchObject({
      items: [{ id: 5 }, { id: 6 }],
      has_more: false,
      next_before_id: 5,
    });
  });

  it('preserves the array contract for mobile clients and handles empty pages', async () => {
    const { service, find } = setup();
    find.mockResolvedValueOnce(rows(4, 3));
    expect(
      await service.execute(9, { participant_type: channel, page: 2, limit: 2 }, user),
    ).toMatchObject([{ id: 3 }, { id: 4 }]);
    expect(find).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 2, take: 2 }));
    find.mockResolvedValueOnce([]);
    expect(
      await service.execute(9, { participant_type: channel, paginated: 'true' }, user),
    ).toEqual({ items: [], has_more: false, next_before_id: null });
  });

  it('checks participant access before reading any messages', async () => {
    const { service, find, assertCanParticipate } = setup();
    assertCanParticipate.mockRejectedValueOnce(new ForbiddenException());
    await expect(
      service.execute(9, { participant_type: channel, before_id: 8 }, user),
    ).rejects.toThrow(ForbiddenException);
    expect(find).not.toHaveBeenCalled();
  });

  it('rejects invalid limits and cursor values', async () => {
    for (const values of [{ limit: 101 }, { before_id: 0 }, { before_id: 'bad' }, { page: -1 }]) {
      const query = plainToInstance(ListChatMessagesDto, { participant_type: channel, ...values });
      expect((await validate(query)).length).toBeGreaterThan(0);
    }
  });
});
