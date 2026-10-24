import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AccountScreen } from './account-screen';
import { apiGet } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';

jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => ({ user: { id: 1, name: 'Test user', email: 'test@example.invalid', cpf: null, created_at: '2026-01-01T00:00:00Z' }, refresh: jest.fn() }) }));
jest.mock('@/shared/lib/api', () => ({ API_URL: 'http://localhost:3001', apiGet: jest.fn(), apiPatch: jest.fn(), apiPost: jest.fn(), apiUpload: jest.fn() }));
jest.mock('@/shared/lib/toast', () => ({ toast: { info: jest.fn(), error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

describe('Personal data export preview', () => {
  let element: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    jest.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    element = document.createElement('div'); document.body.append(element); root = createRoot(element);
    await act(async () => root.render(<AccountScreen />));
  });
  afterEach(async () => { await act(async () => root.unmount()); element.remove(); });
  const button = (label: string) => Array.from(document.querySelectorAll('button')).find(value => value.textContent === label)!;

  it.each(['Excel', 'JSON', 'PDF'])('opens the modal and previews %s without downloading personal data', async format => {
    const download = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    try {
      await act(async () => button('Exportar meus dados').click());
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain('próxima versão');
      await act(async () => button(format).click());
      expect(toast.info).toHaveBeenCalledWith(expect.stringContaining(format));
      expect(apiGet).not.toHaveBeenCalled();
      expect(download).not.toHaveBeenCalled();
    } finally { download.mockRestore(); }
  });

  it('closes the preview with Escape', async () => {
    await act(async () => button('Exportar meus dados').click());
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
