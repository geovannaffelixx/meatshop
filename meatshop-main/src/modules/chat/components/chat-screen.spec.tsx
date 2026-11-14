import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatScreen } from './chat-screen';
import { apiGet } from '@/shared/lib/api';
import { io } from 'socket.io-client';

jest.mock('@/shared/lib/api', () => ({ apiGet: jest.fn() }));
jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => ({ user: { id: 23 }, unitId: 9 }) }));
jest.mock('./chat-thread', () => ({ ChatThread: ({ orderId, participantType, onRead }: { orderId: number; participantType: string; onRead: (id: number, type: string) => void }) => <><p>Conversa {orderId}</p><p>Canal {participantType}</p><button onClick={() => onRead(orderId, participantType)}>Confirmar leitura</button></> }));
const params = new URLSearchParams();
jest.mock('next/navigation', () => ({ useSearchParams: () => params }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));
const handlers: Record<string, (event: {unit_id: number}) => void> = {};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(io).mockReturnValue({ on: jest.fn((event, handler) => { handlers[event] = handler; }), emit: jest.fn(), disconnect: jest.fn() } as never);
});

it('identifies unread channels before opening and only clears the acknowledged channel', async () => {
  jest.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  jest.mocked(apiGet).mockResolvedValueOnce({ data: [{id: 42, client_name: 'Ana', delivery_person_id: 7, status: 'CONFIRMED', chat_unread: {client: 2, delivery: 3}}], meta: {total: 1, totalPages: 1} });
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<ChatScreen />));
    await act(async () => jest.advanceTimersByTime(250));
    expect(container.textContent).not.toContain('Conversa 42');
    expect(container.querySelector('[aria-label="2 mensagens não lidas do cliente no pedido 42"]')).not.toBeNull();
    await act(async () => (container.querySelector('[aria-label="3 mensagens não lidas do entregador no pedido 42"]') as HTMLButtonElement).click());
    expect(container.textContent).toContain('Canal UNIT_DELIVERY_PERSON');
    await act(async () => Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Confirmar leitura')!.click());
    expect(container.querySelector('[aria-label="3 mensagens não lidas do entregador no pedido 42"]')).toBeNull();
    expect(container.querySelector('[aria-label="2 mensagens não lidas do cliente no pedido 42"]')).not.toBeNull();
  } finally {
    await act(async () => root.unmount()); container.remove(); jest.useRealTimers();
  }
});

it('moves the newest conversation to the top without replacing the open conversation', async () => {
  jest.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const order = (id: number) => ({ id, client_id: id, client_name: `Cliente ${id}`, unit_id: 9, status: 'CONFIRMED' });
  jest.mocked(apiGet).mockResolvedValueOnce({ data: [order(11), order(1)], meta: { total: 2, totalPages: 1 } });
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<ChatScreen />));
    await act(async () => jest.advanceTimersByTime(250));
    await act(async () => Array.from(container.querySelectorAll('aside button')).find(button => button.textContent?.includes('Cliente 11'))!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('Conversa 11');
    jest.mocked(apiGet).mockResolvedValueOnce({ data: [order(1), order(11)], meta: { total: 2, totalPages: 1 } });
    await act(async () => handlers['chat:inbox:updated']({unit_id: 9}));
    await act(async () => jest.advanceTimersByTime(250));
    expect(apiGet).toHaveBeenLastCalledWith(expect.stringContaining('sort=chat_activity'), expect.anything());
    const clients = Array.from(container.querySelectorAll('aside button strong')).map(node => node.textContent);
    expect(clients).toEqual(['Cliente 1', 'Cliente 11']);
    expect(container.textContent).toContain('Conversa 11');
    const calls = jest.mocked(apiGet).mock.calls.length;
    await act(async () => handlers['chat:inbox:updated']({unit_id: 8}));
    await act(async () => jest.advanceTimersByTime(250));
    expect(apiGet).toHaveBeenCalledTimes(calls);
  } finally {
    await act(async () => root.unmount()); container.remove(); jest.useRealTimers();
  }
});

it('paginates and searches on the server instead of fetching the full order list', async () => {
  jest.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const order = (id: number) => ({ id, client_id: id, client_name: `Cliente ${id}`, unit_id: 9, delivery_person_id: null, status: 'CONFIRMED' });
  jest.mocked(apiGet).mockResolvedValueOnce({ data: [order(11)], meta: { total: 11, totalPages: 2 } });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<ChatScreen />));
    await act(async () => jest.advanceTimersByTime(250));
    expect(apiGet).toHaveBeenLastCalledWith(expect.stringContaining('paginated=true&page=1&limit=10'), expect.anything());
    expect(container.textContent).not.toContain('Conversa 11');
    await act(async () => Array.from(container.querySelectorAll('aside button')).find(button => button.textContent?.includes('Cliente 11'))!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('Conversa 11');
    jest.mocked(apiGet).mockResolvedValueOnce({ data: [order(1)], meta: { total: 11, totalPages: 2 } });
    await act(async () => (container.querySelector('[aria-label="Próxima página"]') as HTMLButtonElement).click());
    await act(async () => jest.advanceTimersByTime(250));
    expect(apiGet).toHaveBeenLastCalledWith(expect.stringContaining('page=2'), expect.anything());
    await act(async () => Array.from(container.querySelectorAll('aside button')).find(button => button.textContent?.includes('Cliente 1'))!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('Conversa 1');
    jest.mocked(apiGet).mockResolvedValueOnce({ data: [order(7)], meta: { total: 1, totalPages: 1 } });
    const input = container.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Joana');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => jest.advanceTimersByTime(250));
    const url = String(jest.mocked(apiGet).mock.calls.at(-1)![0]);
    expect(url).toContain('page=1');
    expect(url).toContain('search=Joana');
    expect(url).toContain('unit_id=9');
    await act(async () => Array.from(container.querySelectorAll('aside button')).find(button => button.textContent?.includes('Cliente 7'))!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('Conversa 7');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  }
});
