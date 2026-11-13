import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatScreen } from './chat-screen';
import { apiGet } from '@/shared/lib/api';

jest.mock('@/shared/lib/api', () => ({ apiGet: jest.fn() }));
jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => ({ user: { id: 23 }, unitId: 9 }) }));
jest.mock('./chat-thread', () => ({ ChatThread: ({ orderId }: { orderId: number }) => <p>Conversa {orderId}</p> }));
const params = new URLSearchParams();
jest.mock('next/navigation', () => ({ useSearchParams: () => params }));

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
    expect(container.textContent).toContain('Conversa 11');
    jest.mocked(apiGet).mockResolvedValueOnce({ data: [order(1)], meta: { total: 11, totalPages: 2 } });
    await act(async () => (container.querySelector('[aria-label="Próxima página"]') as HTMLButtonElement).click());
    await act(async () => jest.advanceTimersByTime(250));
    expect(apiGet).toHaveBeenLastCalledWith(expect.stringContaining('page=2'), expect.anything());
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
    expect(container.textContent).toContain('Conversa 7');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
  }
});
