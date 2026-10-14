import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PaymentActions } from './payment-management';

let permissions: string[] = [];
jest.mock('@/shared/providers/panel-access-provider', () => ({
  usePanelAccess: () => ({ hasPermission: (value: string) => permissions.includes(value) }),
}));
jest.mock('@/shared/lib/api', () => ({ apiPost: jest.fn(), apiGet: jest.fn() }));

describe('Payment actions in the panel', () => {
  let container: HTMLDivElement;
  let root: Root;
  const order = { id: 1, status: 'PENDING', payment_status: 'PENDING', total_amount: 50,
    method: 'Pix', refunded_amount: 0, fee_amount: 0, refund_status: null };
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    permissions = ['MANAGE_FINANCE', 'VIEW_FINANCE'];
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  const render = async (changes = {}) => {
    await act(async () => root.render(<PaymentActions order={{ ...order, ...changes }} onChange={() => {}} />));
    return container.textContent;
  };
  it('never offers manual receipt for an online payment', async () => {
    expect(await render()).not.toContain('Registrar recebimento');
    expect(container.textContent).toContain('Atualizar no Mercado Pago');
  });
  it('offers receipt for pending cash only to financial managers', async () => {
    expect(await render({ method: 'Cash' })).toContain('Registrar recebimento');
    permissions = ['VIEW_FINANCE'];
    expect(await render({ method: 'Cash' })).not.toContain('Registrar recebimento');
  });
  it('requires cancellation or delivery before offering an online refund', async () => {
    expect(await render({ payment_status: 'PAID' })).not.toContain('Solicitar estorno');
    expect(await render({ payment_status: 'PAID', status: 'CANCELLED' })).toContain('Solicitar estorno');
    expect(await render({ payment_status: 'PAID', status: 'CANCELLED', refund_status: 'PENDING' })).not.toContain('Solicitar estorno');
  });
});
