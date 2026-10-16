import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { Socket } from 'socket.io';
import { ChatGateway } from './chat.gateway';
import { ChatParticipantType } from './enums/chat-participant-type.enum';

describe('ChatGateway typing events', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  function setup(denied = false) {
    const broadcast = jest.fn();
    const emit = jest.fn();
    const authorize = jest.fn(async () => {
      if (denied) throw new Error('Acesso negado.');
    });
    const findOne = jest.fn(async () => ({ id: 10 }));
    const gateway = new ChatGateway(
      {} as never,
      {} as never,
      { findOne } as never,
      { assertCanParticipate: authorize } as never,
      {} as never,
      {} as never,
    );
    const socket = {
      data: { user: { id: 7 } },
      emit,
      to: jest.fn(() => ({ emit: broadcast })),
    } as unknown as Socket;
    const event = { order_id: 10, participant_type: ChatParticipantType.UNIT, typing: true };
    return { gateway, socket, event, emit, broadcast, authorize };
  }

  it('coalesces rapid keystrokes without connection errors and accepts later updates', async () => {
    jest.useFakeTimers();
    const { gateway, socket, event, emit, broadcast, authorize } = setup();
    for (let index = 0; index < 30; index++) await gateway.handleTyping(socket, event);
    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(authorize).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1200);
    await gateway.handleTyping(socket, { ...event, typing: false });
    expect(broadcast).toHaveBeenLastCalledWith(
      'chat:typing',
      expect.objectContaining({ typing: false }),
    );
  });

  it('still rejects unauthorized typing', async () => {
    const { gateway, socket, event, emit, broadcast } = setup(true);
    await gateway.handleTyping(socket, event);
    expect(emit).toHaveBeenCalledWith('chat:error', { message: 'Acesso negado.' });
    expect(broadcast).not.toHaveBeenCalled();
  });
});
