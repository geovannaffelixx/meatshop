import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useTablePagination } from './use-table-pagination';

function Probe({ count, filter = '' }: { count: number; filter?: string }) {
  const query = useTablePagination(Array.from({ length: count }, (_, i) => i + 1), filter);
  return <div><span data-testid="rows">{query.pageData.join(',')}</span><span data-testid="page">{query.page}</span><button onClick={() => query.onPageChange(2)}>Próxima</button></div>;
}

describe('Ten item table pages', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('slices ten rows and resets the selected page when a filter changes', async () => {
    await act(async () => root.render(<Probe count={23} />));
    expect(container.querySelector('[data-testid="rows"]')?.textContent).toBe('1,2,3,4,5,6,7,8,9,10');
    await act(async () => (container.querySelector('button') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="rows"]')?.textContent).toBe('11,12,13,14,15,16,17,18,19,20');
    await act(async () => root.render(<Probe count={23} filter="other" />));
    expect(container.querySelector('[data-testid="page"]')?.textContent).toBe('1');
  });
  it('clamps the page after deletion reduces the result count', async () => {
    await act(async () => root.render(<Probe count={11} />));
    await act(async () => (container.querySelector('button') as HTMLButtonElement).click());
    await act(async () => root.render(<Probe count={10} />));
    expect(container.querySelector('[data-testid="page"]')?.textContent).toBe('1');
  });
});
