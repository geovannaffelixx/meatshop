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
    jest.mocked(apiGet).mockImplementation(async path => {
      if (path.startsWith('/products')) return { data: [{ id: 1, name: 'Produto' }] };
      const params = new URL(path, 'http://localhost').searchParams;
      const page = Number(params.get('page') ?? 1);
      const search = params.get('search');
      const filtered = search ? items.filter(item => item.id === 21) : items;
      return { data: filtered.slice((page - 1) * 10, page * 10), meta: { page, limit: 10, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / 10)) } };
    });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); resetApiCache(); container.remove(); });
  it('loads each page from the backend and resets pagination after a remote search', async () => {
    jest.mocked(apiGet).mockClear();
    await act(async () => root.render(<Screen />));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    const requests = jest.mocked(apiGet).mock.calls.length;
    await act(async () => (container.querySelector('[aria-label="Próxima página"]') as HTMLButtonElement).click());
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    await act(async () => (container.querySelector('[aria-label="Próxima página"]') as HTMLButtonElement).click());
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.textContent).toContain('21–21 de 21');
    expect(jest.mocked(apiGet).mock.calls).toHaveLength(requests + 2);
    expect(jest.mocked(apiGet).mock.calls.some(([path]) => path.includes('page=3') && path.includes('limit=10'))).toBe(true);
    const input = container.querySelector('input[type="search"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '21');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 350));
    });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.textContent).toContain('1–1 de 1');
    expect(jest.mocked(apiGet).mock.calls.some(([path]) => path.includes('search=21') && path.includes('page=1'))).toBe(true);
  });
});
