import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReportExportDialog } from './report-export-dialog';
import { apiGet } from '@/shared/lib/api';
import { useApiQuery } from '@/shared/hooks/use-api-query';

const mockAccess = {
  user: { id: 1, global_role: 'USER' },
  unitId: 8,
  selectedMembership: { role: 'OWNER', unit_name: 'Açougue Centro' },
};
jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => mockAccess }));
jest.mock('@/shared/hooks/use-api-query', () => ({
  useApiQuery: jest.fn(() => ({
    data: [
      { id: 8, name: 'Açougue Centro' },
      { id: 9, name: 'Filial' },
    ],
    error: null,
    refetch: jest.fn(),
  })),
}));
jest.mock('@/shared/lib/api', () => ({ apiGet: jest.fn() }));
jest.mock('@/shared/lib/toast', () => ({ toast: { success: jest.fn() } }));

describe('Report export dialog', () => {
  let element: HTMLDivElement;
  let root: Root;
  let click: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccess.user.global_role = 'USER';
    mockAccess.selectedMembership.role = 'OWNER';
    mockAccess.unitId = 8;
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    Object.assign(URL, {
      createObjectURL: jest.fn(() => 'blob:report'),
      revokeObjectURL: jest.fn(),
    });
    click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    element = document.createElement('div');
    document.body.append(element);
    root = createRoot(element);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    element.remove();
    click.mockRestore();
  });
  const button = (label: string) =>
    Array.from(document.querySelectorAll('button')).find((item) => item.textContent === label)!;
  const open = async () => {
    await act(async () => button('Exportar').click());
  };

  it.each(['OPERATOR', 'DELIVERY'])('hides exports from %s', async (role) => {
    mockAccess.selectedMembership.role = role;
    await act(async () => root.render(<ReportExportDialog report="orders" />));
    expect(button('Exportar')).toBeUndefined();
  });
  it.each(['OWNER', 'MANAGER'])('uses the current unit and excludes JSON for %s', async (role) => {
    mockAccess.selectedMembership.role = role;
    jest.mocked(apiGet).mockResolvedValue(new Blob(['excel']));
    await act(async () =>
      root.render(
        <ReportExportDialog
          report="orders"
          filters={{ status: 'CONFIRMED', date_from: '2026-11-01' }}
        />,
      ),
    );
    await open();
    expect(document.querySelector('option[value="json"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Açougue Centro');
    await act(async () => button('Baixar arquivo').click());
    const path = jest.mocked(apiGet).mock.calls[0][0];
    expect(path).toContain('unit_id=8');
    expect(path).toContain('status=CONFIRMED');
    expect(path).toContain('date_from=2026-11-01');
    expect(click).toHaveBeenCalledTimes(1);
  });
  it('requires the admin to choose a unit and offers JSON', async () => {
    mockAccess.user.global_role = 'SUPER_ADMIN';
    await act(async () => root.render(<ReportExportDialog report="coupons" />));
    await open();
    expect(document.querySelector('option[value="json"]')).not.toBeNull();
    expect(button('Baixar arquivo').disabled).toBe(true);
    const select = document.querySelector('select')!;
    await act(async () => {
      select.value = '9';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(button('Baixar arquivo').disabled).toBe(false);
  });
  it('reloads review products for the unit selected by SUPER_ADMIN', async () => {
    mockAccess.user.global_role = 'SUPER_ADMIN';
    await act(async () => root.render(<ReportExportDialog report="reviews" />));
    await open();
    const select = document.querySelector('select')!;
    await act(async () => {
      select.value = '9';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(jest.mocked(useApiQuery)).toHaveBeenCalledWith('/exports/review-products?unit_id=9');
    const reviewFilter = Array.from(document.querySelectorAll('label')).find((label) =>
      label.textContent?.startsWith('Avaliações'),
    )?.querySelector('select');
    expect(reviewFilter?.value).toBe('all');
  });
  it('shows a useful failure and allows retrying', async () => {
    jest
      .mocked(apiGet)
      .mockRejectedValue(new Error('Não foi possível preparar o arquivo. Tente novamente.'));
    await act(async () =>
      root.render(<ReportExportDialog report="finance" filters={{ month: '2026-11' }} />),
    );
    await open();
    await act(async () => button('Baixar arquivo').click());
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Tente novamente');
    expect(button('Baixar arquivo').disabled).toBe(false);
    expect(click).not.toHaveBeenCalled();
  });
  it('aborts an in-flight export when the selected unit changes', async () => {
    jest.mocked(apiGet).mockImplementation(() => new Promise(() => {}));
    await act(async () => root.render(<ReportExportDialog report="orders" />));
    await open();
    await act(async () => button('Baixar arquivo').click());
    const signal = jest.mocked(apiGet).mock.calls[0][1]?.signal;
    mockAccess.unitId = 9;
    await act(async () => root.render(<ReportExportDialog report="orders" />));
    expect(signal?.aborted).toBe(true);
    expect(click).not.toHaveBeenCalled();
  });
});
