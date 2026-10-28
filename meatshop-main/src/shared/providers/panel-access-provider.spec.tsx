import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PanelAccessProvider, usePanelAccess } from './panel-access-provider';
import { apiGet } from '@/shared/lib/api';
import { resetApiCache } from '@/shared/lib/query-cache';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ usePathname: () => '/products', useRouter: () => ({ replace }) }));
jest.mock('@/shared/lib/api', () => ({ apiGet: jest.fn() }));

function Probe() {
  const { unitId, setUnitId } = usePanelAccess();
  return <div><span data-testid="unit">{unitId}</span><button onClick={() => setUnitId(7)}>Trocar</button><button onClick={() => setUnitId(6)}>Mesma unidade</button><button onClick={() => setUnitId(999)}>Sem acesso</button></div>;
}

describe('Unit switching', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('meatshop:selected-unit-id', '6');
    localStorage.setItem('meatshop:selected-unit-user-id', '1');
    resetApiCache();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    jest.mocked(apiGet).mockResolvedValue({ user: { id: 1, name: 'Manager', global_role: 'USER' }, panel: { can_access: true, memberships: [
      { unit_id: 6, unit_name: 'Loja A', permissions: ['MANAGE_PRODUCTS'] },
      { unit_id: 7, unit_name: 'Loja B', permissions: ['MANAGE_PRODUCTS'] },
    ] } });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    resetApiCache(); container.remove(); jest.useRealTimers();
  });
  it('covers the interface for three seconds and persists the valid unit', async () => {
    await act(async () => root.render(<PanelAccessProvider><Probe /></PanelAccessProvider>));
    await act(async () => (container.querySelectorAll('button')[0] as HTMLButtonElement).click());
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Loja B');
    expect(container.querySelector('[inert]')).not.toBeNull();
    expect(localStorage.getItem('meatshop:selected-unit-id')).toBe('7');
    act(() => jest.advanceTimersByTime(2999));
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[data-testid="unit"]')?.textContent).toBe('7');
  });
  it('keeps the user only in memory and purges the legacy persisted profile', async () => {
    localStorage.setItem('currentUser', JSON.stringify({ cpf: '12345678900' }));
    await act(async () => root.render(<PanelAccessProvider><Probe /></PanelAccessProvider>));
    expect(container.querySelector('[data-testid="unit"]')?.textContent).toBe('6');
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(Object.keys(localStorage).sort()).toEqual(['meatshop:selected-unit-id', 'meatshop:selected-unit-user-id'].sort());
  });
  it('ignores the current unit and units outside the membership list', async () => {
    await act(async () => root.render(<PanelAccessProvider><Probe /></PanelAccessProvider>));
    await act(async () => (container.querySelectorAll('button')[1] as HTMLButtonElement).click());
    await act(async () => (container.querySelectorAll('button')[2] as HTMLButtonElement).click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[data-testid="unit"]')?.textContent).toBe('6');
  });
  it('requires a choice instead of selecting the first unit for a fresh multi-unit session', async () => {
    localStorage.clear();
    await act(async () => root.render(<PanelAccessProvider><Probe /></PanelAccessProvider>));
    expect(container.querySelector('[data-testid="unit"]')?.textContent).toBe('');
    expect(localStorage.getItem('meatshop:selected-unit-id')).toBeNull();
  });
});
