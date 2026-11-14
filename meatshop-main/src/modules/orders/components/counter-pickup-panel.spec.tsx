import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CounterPickupPanel } from './counter-pickup-panel';

describe('Counter pickup confirmation', () => {
  let container: HTMLDivElement;
  let root: Root;
  const confirm = jest.fn();
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container); confirm.mockClear();
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  const render = async (paymentStatus: string, code: string, busy = false) => {
    await act(async () => root.render(<CounterPickupPanel paymentStatus={paymentStatus} code={code} busy={busy} onCodeChange={() => {}} onConfirm={confirm} />));
    return container.querySelector('button')!;
  };
  it('explains where to find the customer code and requires recorded payment', async () => {
    const button = await render('PENDING', '123456');
    expect(button.disabled).toBe(true);
    expect(container.textContent).toContain('Registrar recebimento');
    expect(container.textContent).toContain('Meus pedidos → Ver retirada e código');
  });
  it('only enables confirmation with a paid order and six digits', async () => {
    expect((await render('PAID', '123')).disabled).toBe(true);
    expect((await render('PAID', 'abcdef')).disabled).toBe(true);
    const button = await render('PAID', '123456');
    expect(button.disabled).toBe(false);
    await act(async () => button.click());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect((await render('PAID', '123456', true)).disabled).toBe(true);
  });
  it('provides a receipt action while keeping delivery confirmation blocked for pending payment', async () => {
    const record = jest.fn();
    await act(async () => root.render(<CounterPickupPanel paymentStatus="PENDING" code="123456" busy={false} onCodeChange={() => {}} onConfirm={confirm} onRecordPayment={record} />));
    const buttons = [...container.querySelectorAll('button')];
    const receipt = buttons.find((button) => button.textContent?.includes('Registrar pagamento'))!;
    expect(receipt.disabled).toBe(false);
    await act(async () => receipt.click());
    expect(record).toHaveBeenCalledTimes(1);
    expect(buttons.find((button) => button.textContent?.includes('Validar código'))?.disabled).toBe(true);
    expect(container.textContent).toContain('O botão será liberado');
  });
});
