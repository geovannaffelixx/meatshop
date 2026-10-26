import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AccountScreen } from './account-screen';
import { apiGet } from '@/shared/lib/api';
import { ApiError } from '@/shared/lib/api-error-translations';
import { toast } from '@/shared/lib/toast';

jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => ({ user: { id: 1, name: 'Test user', email: 'test@example.invalid', cpf: null, created_at: '2026-01-01T00:00:00Z' }, refresh: jest.fn() }) }));
jest.mock('@/shared/lib/api', () => ({ API_URL: 'http://localhost:3001', apiGet: jest.fn(), apiPatch: jest.fn(), apiPost: jest.fn(), apiUpload: jest.fn() }));
jest.mock('@/shared/lib/toast', () => ({ toast: { info: jest.fn(), error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

describe('Personal data export', () => {
  let element: HTMLDivElement;
  let root: Root;
  let download: jest.SpyInstance;
  beforeEach(async () => {
    jest.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:export'), revokeObjectURL: jest.fn() });
    download = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    element = document.createElement('div'); document.body.append(element); root = createRoot(element);
    await act(async () => root.render(<AccountScreen />));
  });
  afterEach(async () => { download.mockRestore(); await act(async () => root.unmount()); element.remove(); });
  const button = (label: string) => Array.from(document.querySelectorAll('button')).find(value => value.textContent === label)!;

  it('downloads the personal data JSON returned by the API', async () => {
    jest.mocked(apiGet).mockResolvedValue({ user: { id: 1 } });
    await act(async () => button('Exportar meus dados').click());
    await act(async () => button('Baixar arquivo JSON').click());
    expect(apiGet).toHaveBeenCalledWith('/users/me/export', { cache: false, silent: true });
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(download).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows the translated error and allows retrying when the export fails', async () => {
    jest.mocked(apiGet).mockRejectedValue(new ApiError('Você não tem permissão para realizar esta ação.', 403));
    await act(async () => button('Exportar meus dados').click());
    await act(async () => button('Baixar arquivo JSON').click());
    expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('permissão');
    expect(download).not.toHaveBeenCalled();
    expect(button('Baixar arquivo JSON').disabled).toBe(false);
  });

  it('closes the dialog with Escape', async () => {
    await act(async () => button('Exportar meus dados').click());
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
