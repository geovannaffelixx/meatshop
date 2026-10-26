import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { UserProfileDrawer } from './user-profile-drawer';
import { apiPost } from '@/shared/lib/api';
import { resetApiCache } from '@/shared/lib/query-cache';
import { toast } from '@/shared/lib/toast';
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => ({ user: { id: 1, name: 'Ana Silva', email: 'ana@example.com', global_role: 'USER' }, selectedMembership: { unit_name: 'Loja A', role: 'MANAGER' } }) }));
jest.mock('@/shared/components/user-avatar', () => ({ UserAvatar: ({ name }: { name: string }) => <span>{name}</span> }));
jest.mock('@/shared/lib/api', () => ({ apiPost: jest.fn() }));
jest.mock('@/shared/lib/query-cache', () => ({ resetApiCache: jest.fn() }));
jest.mock('@/shared/lib/toast', () => ({ toast: { error: jest.fn() } }));

describe('Header profile drawer', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    jest.clearAllMocks(); localStorage.clear();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => root.render(<UserProfileDrawer />));
    await act(async () => container.querySelector('button')!.click());
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('shows the current membership, links to account/security, and closes with Escape', async () => {
    const drawer = document.querySelector('[role="dialog"]')!;
    expect(drawer.textContent).toContain('ana@example.com');
    expect(drawer.textContent).toContain('Loja A');
    expect(drawer.textContent).toContain('Gerente');
    expect(drawer.querySelector('[href="/settings/account"]')).not.toBeNull();
    expect(drawer.querySelectorAll('a')).toHaveLength(1);
    expect(drawer.querySelector('a')?.textContent).toContain('Gerenciar minha conta');
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('clears the selected unit and navigates only after successful logout', async () => {
    localStorage.setItem('meatshop:selected-unit-id', '6');
    (apiPost as jest.Mock).mockResolvedValue({});
    const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Sair')!;
    await act(async () => button.click());
    expect(apiPost).toHaveBeenCalledWith('/auth/logout', {});
    expect(resetApiCache).toHaveBeenCalled();
    expect(localStorage.getItem('meatshop:selected-unit-id')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/login');
  });
  it('keeps the session and permits retry when logout fails', async () => {
    localStorage.setItem('meatshop:selected-unit-id', '6');
    (apiPost as jest.Mock).mockRejectedValue(new Error('offline'));
    const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Sair')!;
    await act(async () => button.click());
    expect(toast.error).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem('meatshop:selected-unit-id')).toBe('6');
    expect(button.disabled).toBe(false);
  });
});
