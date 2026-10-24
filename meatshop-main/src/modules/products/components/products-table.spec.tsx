import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProductsTable } from './products-table';
const push = jest.fn();
jest.mock('./product-details-dialog', () => ({ ProductDetailsDialog: ({ productId, onClose }: { productId: number; onClose: () => void }) => <div role="dialog">Produto #{productId}<button onClick={onClose}>Fechar detalhes</button></div> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/shared/hooks/use-managed-units', () => ({ useManagedUnits: () => ({ unitId: 6 }) }));
jest.mock('@/shared/hooks/use-api-query', () => ({ useApiQuery: () => ({ isPending: false, data: { meta: { page: 1, limit: 10, total: 1, totalPages: 1 }, data: [{ id: 10, name: 'Produto teste', active: true, stock_quantity: 20, stock_min_quantity: 5, price: 15, unit_of_measure: 'kg' }] } }) }));

describe('Product editing navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    push.mockClear();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => root.render(<ProductsTable filters={{ id: '', name: '', category: '', status: '' }} currentPage={1} onPageChange={jest.fn()} />));
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('opens details through the row and editing only through its button', async () => {
    const row = container.querySelector('tbody tr') as HTMLTableRowElement;
    await act(async () => row.querySelector('td')!.click());
    await act(async () => row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(push).not.toHaveBeenCalled();
    expect(row.hasAttribute('tabindex')).toBe(true);
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Produto #10');
    await act(async () => row.querySelector('button')!.click());
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/products/10');
  });
});
