import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatThread } from './chat-thread';
import { apiGet, apiPatch } from '@/shared/lib/api';
import { io } from 'socket.io-client';
import { toast } from '@/shared/lib/toast';

jest.mock('@/shared/lib/api', () => ({ API_URL: '', apiGet: jest.fn(), apiPatch: jest.fn(), apiPost: jest.fn() }));
jest.mock('@/shared/lib/toast', () => ({ toast: { error: jest.fn() } }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));

it('loads older batches with a cursor, preserves realtime messages and retries failures', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Element.prototype.scrollIntoView = jest.fn();
  jest.clearAllMocks();
  const message = (id: number) => ({ id, order_id: 10, participant_type: 'UNIT', sender_id: 2, sender_name: 'Ana', message: `Mensagem ${id}`, sent_at: '2026-11-12T12:00:00Z', read_at: null });
  jest.mocked(apiGet).mockResolvedValueOnce({ items: [message(3), message(4)], has_more: true, next_before_id: 3 });
  jest.mocked(apiPatch).mockResolvedValue({});
  const handlers: Record<string, (...args: never[]) => void> = {};
  jest.mocked(io).mockReturnValue({ connected: true, on: jest.fn((event, handler) => { handlers[event] = handler; }), emit: jest.fn(), disconnect: jest.fn() } as never);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<ChatThread orderId={10} participantType='UNIT' participantLabel='Ana' currentUserId={1} closed={false} />));
    await act(async () => handlers['chat:message'](message(5) as never));
    const olderButton = () => Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Carregar mensagens anteriores')!;
    jest.mocked(apiGet).mockRejectedValueOnce(new Error('offline'));
    await act(async () => olderButton().click());
    expect(toast.error).toHaveBeenCalled();
    expect(container.textContent).toContain('Mensagem 5');
    jest.mocked(apiGet).mockResolvedValueOnce({ items: [message(1), message(2), message(3)], has_more: false, next_before_id: 1 });
    await act(async () => olderButton().click());
    expect(apiGet).toHaveBeenLastCalledWith(expect.stringContaining('before_id=3'), expect.objectContaining({ silent: true }));
    expect(Array.from(container.querySelectorAll('article p:last-of-type')).map(node => node.textContent))
      .toEqual(['Mensagem 1', 'Mensagem 2', 'Mensagem 3', 'Mensagem 4', 'Mensagem 5']);
    expect(olderButton()).toBeUndefined();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it('limits typing notifications while preserving the draft and signals inactivity', async () => {
  jest.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Element.prototype.scrollIntoView = jest.fn();
  jest.mocked(apiGet).mockResolvedValue({ items: [], has_more: false, next_before_id: null });
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
