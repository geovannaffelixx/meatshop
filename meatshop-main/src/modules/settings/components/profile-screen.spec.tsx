import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProfileScreen } from './profile-screen';
import { apiGet, apiPatch, apiPut } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';

jest.mock('@/shared/providers/panel-access-provider', () => ({
  usePanelAccess: () => ({ unitId: 6, refresh: jest.fn() }),
}));
jest.mock('@/shared/components/maps/address-pin-picker', () => ({ AddressPinPicker: () => null }));
jest.mock('@/shared/lib/api', () => ({ apiGet: jest.fn(), apiPut: jest.fn(), apiPatch: jest.fn(), resolveAssetUrl: jest.fn() }));
jest.mock('@/shared/lib/toast', () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } }));

describe('unit scheduling settings', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    (apiGet as jest.Mock).mockImplementation(async (url: string) => url.endsWith('business-hours') ? [
      { id: 41, weekday: 'MONDAY', is_open: true, opening_time: '08:00:00', closing_time: '18:00:00' },
    ] : {
      name: 'Test unit', scheduling_slot_minutes: 30, scheduling_capacity: 1,
    });
    (apiPut as jest.Mock).mockResolvedValue([]);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  async function save() {
    await act(async () => root.render(<ProfileScreen />));
    const button = [...container.querySelectorAll('button')].find(element => element.textContent?.includes('Salvar horários e agendamento'));
    if (!button) throw new Error('Scheduling save control not available');
    await act(async () => button.click());
  }

  it('saves business hours and capacity in a single request', async () => {
    await save();
    expect(apiPut).toHaveBeenCalledWith('/units/6/business-hours', expect.objectContaining({
      days: expect.any(Array), scheduling_slot_minutes: 30, scheduling_capacity: 1,
    }));
    expect(apiPatch).not.toHaveBeenCalled();
    expect((apiPut as jest.Mock).mock.calls[0][1].days[0]).toMatchObject({
      opening_time: '08:00', closing_time: '18:00',
    });
    expect((apiPut as jest.Mock).mock.calls[0][1].days[0]).not.toHaveProperty('id');
    expect(toast.success).toHaveBeenCalledTimes(1);
    const duration = container.querySelector('[aria-label="Duração do intervalo de agendamento"]');
    expect(duration).not.toBeNull();
  });

  it('reports a failed save without displaying success', async () => {
    (apiPut as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));
    await save();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
