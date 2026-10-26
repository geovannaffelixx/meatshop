import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SupportDetailScreen } from './support-detail-screen';
import type { SupportTicket } from './types';

const mockTicket: SupportTicket = {
  id: 9, user_id: 1, unit_id: null, order_id: null, subject: 'Erro no pagamento', description: null, status: 'OPEN',
  category: 'BILLING', priority: 'HIGH', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z',
  last_message_at: '2026-10-01T10:00:00Z', closed_at: null, contact: null, messages: [],
};
let mockData: SupportTicket = mockTicket;
let mockRole = 'USER';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/shared/hooks/use-api-query', () => ({ useApiQuery: () => ({ data: mockData, isPending: false, refetch: jest.fn() }) }));
jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => ({ user: { id: 1, global_role: mockRole } }) }));
jest.mock('@/shared/lib/api', () => ({ apiPatch: jest.fn(), apiUpload: jest.fn(), resolveAssetUrl: (value: string) => value }));

describe('Support ticket detail', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it.each(['USER', 'SUPER_ADMIN'])('shows the informed contact to %s', async role => {
    mockRole = role;
    mockData = { ...mockTicket, contact: '(11) 98888-7777' };
    await act(async () => root.render(<SupportDetailScreen ticketId={9} />));
    expect(container.querySelector('aside')?.textContent).toContain('Contato informado(11) 98888-7777');
  });

  it('omits the contact row when the ticket has none and does not nest main landmarks', async () => {
    mockData = mockTicket;
    await act(async () => root.render(<SupportDetailScreen ticketId={9} />));
    expect(container.textContent).not.toContain('Contato informado');
    expect(container.querySelector('main')).toBeNull();
  });
});
