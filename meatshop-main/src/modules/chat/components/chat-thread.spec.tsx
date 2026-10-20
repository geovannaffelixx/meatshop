import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatThread } from './chat-thread';
import { apiGet, apiPatch } from '@/shared/lib/api';
import { io } from 'socket.io-client';

jest.mock('@/shared/lib/api', () => ({ API_URL: '', apiGet: jest.fn(), apiPatch: jest.fn(), apiPost: jest.fn() }));
jest.mock('@/shared/lib/toast', () => ({ toast: { error: jest.fn() } }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));

it('limits typing notifications while preserving the draft and signals inactivity', async () => {
  jest.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Element.prototype.scrollIntoView = jest.fn();
  jest.mocked(apiGet).mockResolvedValue([]);
  jest.mocked(apiPatch).mockResolvedValue({});
  const emit = jest.fn();
  jest.mocked(io).mockReturnValue({ connected: true, on: jest.fn(), emit, disconnect: jest.fn() } as never);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<ChatThread orderId={10} participantType='UNIT' participantLabel='Ana' currentUserId={1} closed={false} />));
    const textarea = container.querySelector('textarea')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    for (let index = 1; index <= 30; index++) {
      await act(async () => {
        setter.call(textarea, 'a'.repeat(index));
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
    expect(textarea.value).toHaveLength(30);
    expect(emit.mock.calls.filter(([event]) => event === 'chat:typing')).toEqual([
      ['chat:typing', { order_id: 10, participant_type: 'UNIT', typing: true }],
    ]);
    await act(async () => jest.advanceTimersByTime(1200));
    expect(emit).toHaveBeenLastCalledWith('chat:typing', { order_id: 10, participant_type: 'UNIT', typing: false });
  } finally {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  }
});
