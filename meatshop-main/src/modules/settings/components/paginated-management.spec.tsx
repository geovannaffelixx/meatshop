import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CategoriesScreen } from '@/modules/categories/components/categories-screen';
import { PromotionsScreen } from '@/modules/promotions/components/promotions-screen';
import { UsersScreen } from './users-screen';
import { apiGet } from '@/shared/lib/api';
import { resetApiCache } from '@/shared/lib/query-cache';

jest.mock('@/shared/hooks/use-managed-units', () => ({ useManagedUnits: () => ({ unitId: 6, units: [{ id: 6, name: 'Loja A' }], loading: false }) }));
jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => ({ unitId: 6, selectedMembership: { role: 'OWNER' }, hasPermission: () => true }) }));
jest.mock('@/shared/lib/api', () => ({ apiGet: jest.fn(), apiPatch: jest.fn(), apiPost: jest.fn(), apiDelete: jest.fn() }));

const items = Array.from({ length: 21 }, (_, index) => ({ id: index + 1, name: `Registro ${index + 1}`, description: 'Teste', active: true, title: `Promo ${index + 1}`, product_id: 1, discount_percentage: 10, starts_at: '2026-01-01T12:00:00Z', ends_at: '2099-01-01T12:00:00Z', local_role: 'OPERATOR', status: 'ACTIVE', user: { id: index + 1, name: `Pessoa ${index + 1}`, email: `test${index + 1}@example.invalid` } }));

describe.each([CategoriesScreen, PromotionsScreen, UsersScreen])('Management table pages in %s', Screen => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    resetApiCache();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    jest.mocked(apiGet).mockImplementation(async path => path.startsWith('/products') ? { data: [{ id: 1, name: 'Produto' }] } : items);
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); resetApiCache(); container.remove(); });
  it('shows ten, ten and one rows without refetching for each page', async () => {
    jest.mocked(apiGet).mockClear();
    await act(async () => root.render(<Screen />));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    const requests = jest.mocked(apiGet).mock.calls.length;
    await act(async () => (container.querySelector('[aria-label="Próxima página"]') as HTMLButtonElement).click());
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    await act(async () => (container.querySelector('[aria-label="Próxima página"]') as HTMLButtonElement).click());
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.textContent).toContain('21–21 de 21');
    expect(jest.mocked(apiGet).mock.calls).toHaveLength(requests);
  });
});
