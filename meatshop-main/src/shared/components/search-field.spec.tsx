import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SearchField } from './search-field';

describe('Shared search field', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('labels the input and reports typing without submitting a form', async () => {
    const change = jest.fn();
    await act(async () => root.render(<SearchField label="Buscar categorias" value="" onValueChange={change} />));
    const input = container.querySelector('input')!;
    expect(container.querySelector('label')?.htmlFor).toBe(input.id);
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Carnes');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(change).toHaveBeenCalledWith('Carnes');
    expect(container.querySelector('button')).toBeNull();
  });
  it('clears the query and returns focus to the search input', async () => {
    const change = jest.fn();
    await act(async () => root.render(<SearchField label="Buscar cupons" value="TESTE" onValueChange={change} />));
    const clear = container.querySelector('button')!;
    expect(clear.type).toBe('button');
    await act(async () => clear.click());
    expect(change).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(container.querySelector('input'));
  });
});
