import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { UnitStatusToggle } from './unit-status-toggle';
import { apiPatch } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';

jest.mock('@/shared/lib/api', () => ({ apiPatch: jest.fn() }));
jest.mock('@/shared/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe('Unit active status', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onChanged = jest.fn();
  const button = (label: string) => Array.from(document.querySelectorAll('button')).find(item => item.textContent === label);
  async function render(isActive: boolean, canManage = true) {
    await act(async () => root.render(<UnitStatusToggle unitId={4} isActive={isActive} canManage={canManage} onChanged={onChanged} />));
  }
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it('asks for confirmation before deactivating and reports success', async () => {
    jest.mocked(apiPatch).mockResolvedValue({ id: 4, is_active: false });
    await render(true);
    expect(container.textContent).toContain('Unidade ativa');
    await act(async () => button('Desativar unidade')!.click());
    expect(apiPatch).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('não receberá novos pedidos');
    await act(async () => button('Desativar')!.click());
    expect(apiPatch).toHaveBeenCalledWith('/units/4/status', { is_active: false });
    expect(onChanged).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps the dialog open when the API rejects the change', async () => {
    jest.mocked(apiPatch).mockRejectedValue(new Error('forbidden'));
    await render(false);
    expect(container.textContent).toContain('Unidade inativa');
    await act(async () => button('Reativar unidade')!.click());
    await act(async () => button('Reativar')!.click());
    expect(apiPatch).toHaveBeenCalledWith('/units/4/status', { is_active: true });
    expect(onChanged).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('only shows the status badge to members who are not owners', async () => {
    await render(false, false);
    expect(container.textContent).toContain('Unidade inativa');
    expect(button('Reativar unidade')).toBeUndefined();
  });
});
