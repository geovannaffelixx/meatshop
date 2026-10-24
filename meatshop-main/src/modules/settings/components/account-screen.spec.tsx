import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AccountScreen } from './account-screen';
import { apiGet } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';

jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => ({ user: { id: 1, name: 'Test user', email: 'test@example.invalid', cpf: null, created_at: '2026-01-01T00:00:00Z' }, refresh: jest.fn() }) }));
jest.mock('@/shared/lib/api', () => ({ API_URL: 'http://localhost:3001', apiGet: jest.fn(), apiPatch: jest.fn(), apiPost: jest.fn(), apiUpload: jest.fn() }));
jest.mock('@/shared/lib/toast', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

describe('Personal data download', () => {
  let element: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
    element = document.createElement('div'); document.body.append(element); root = createRoot(element);
  });
  afterEach(async () => { await act(async () => root.unmount()); element.remove(); });
  it('downloads only the current accounts export and releases the object URL', async () => {
    jest.useFakeTimers();
    const create = jest.fn(() => 'blob:personal-data');
    const revoke = jest.fn();
    Object.defineProperty(URL,'createObjectURL',{configurable:true,value:create});
    Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:revoke});
    const click = jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(() => undefined);
    (apiGet as jest.Mock).mockResolvedValue({version:1,data:{profile:[]}});
    try {
      await act(async () => root.render(<AccountScreen />));
      const button = Array.from(element.querySelectorAll('button')).find(value => value.textContent === 'Exportar meus dados')!;
      await act(async () => button.click());
      expect(apiGet).toHaveBeenCalledWith('/users/me/export');
      expect(click).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
      act(() => jest.runAllTimers());
      expect(revoke).toHaveBeenCalledWith('blob:personal-data');
    } finally {click.mockRestore();jest.useRealTimers();}
  });
  it('shows an error and permits retry when export fails', async () => {
    (apiGet as jest.Mock).mockRejectedValue(new Error('unavailable'));
    await act(async () => root.render(<AccountScreen />));
    const button = Array.from(element.querySelectorAll('button')).find(value => value.textContent === 'Exportar meus dados')!;
    await act(async () => button.click());
    expect(toast.error).toHaveBeenCalled();
    expect(button.disabled).toBe(false);
  });
});
