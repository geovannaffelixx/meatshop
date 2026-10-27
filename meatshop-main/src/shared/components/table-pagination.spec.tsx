import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DataPagination } from './data-pagination';
import { ReusableTable, type TableColumn } from './reusable-table';

describe('Shared pagination and table', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it('keeps both edges visible and navigates through a large page range', async () => {
    const change = jest.fn();
    await act(async () => root.render(<DataPagination page={10} pageSize={10} totalItems={200} totalPages={20} onPageChange={change} />));
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe('10');
    expect(container.querySelector('[aria-label="Ir para página 1"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Ir para página 20"]')).not.toBeNull();
    await act(async () => (container.querySelector('[aria-label="Última página"]') as HTMLButtonElement).click());
    expect(change).toHaveBeenCalledWith(20);
  });

  it('disables boundary navigation and avoids reloading the current page', async () => {
    const change = jest.fn();
    await act(async () => root.render(<DataPagination page={20} pageSize={10} totalItems={200} totalPages={20} onPageChange={change} />));
    expect((container.querySelector('[aria-label="Próxima página"]') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => (container.querySelector('[aria-current="page"]') as HTMLButtonElement).click());
    expect(change).not.toHaveBeenCalled();
  });

  it('supports an empty result and disables every control while loading', async () => {
    await act(async () => root.render(<DataPagination page={1} pageSize={10} totalItems={0} totalPages={0} isLoading onPageChange={jest.fn()} />));
    expect(container.textContent).toContain('0–0 de 0');
    expect([...container.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
  });

  it('supports row keyboard activation without activating the row for an inner button', async () => {
    const rowClick = jest.fn(); const edit = jest.fn();
    const columns: TableColumn<{ id: number; name: string }>[] = [
      { id: 'name', header: 'Nome', accessor: 'name' },
      { id: 'actions', header: 'Ações', accessor: () => <button onClick={edit}>Editar</button> },
    ];
    await act(async () => root.render(<ReusableTable data={[{ id: 1, name: 'Produto teste' }]} columns={columns} caption="Produtos" keyExtractor={row => row.id} onRowClick={rowClick} />));
    await act(async () => (container.querySelector('button') as HTMLButtonElement).click());
    expect(edit).toHaveBeenCalledTimes(1); expect(rowClick).not.toHaveBeenCalled();
    await act(async () => container.querySelector('tbody tr')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(rowClick).toHaveBeenCalledWith({ id: 1, name: 'Produto teste' });
  });

  it('preserves headers and distinguishes loading from an empty result', async () => {
    const columns: TableColumn<{ id: number }>[] = [{ id: 'id', header: 'Código', accessor: 'id' }];
    await act(async () => root.render(<ReusableTable data={[]} columns={columns} caption="Registros" keyExtractor={row => row.id} isLoading />));
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Nenhum registro encontrado.');
    await act(async () => root.render(<ReusableTable data={[]} columns={columns} caption="Registros" keyExtractor={row => row.id} />));
    expect(container.querySelector('th')?.textContent).toBe('Código');
    expect(container.textContent).toContain('Nenhum registro encontrado.');
  });
});
