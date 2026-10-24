import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProductDetailsDialog } from './product-details-dialog';
import { useApiQuery } from '@/shared/hooks/use-api-query';
jest.mock('@/shared/hooks/use-api-query', () => ({ useApiQuery: jest.fn() }));
jest.mock('@/shared/lib/api', () => ({ resolveAssetUrl: (url: string) => url }));

describe('Product gallery details', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    jest.mocked(useApiQuery).mockReturnValue({ data: { product: { name: 'Picanha', price: 50, unit_of_measure: 'kg', active: false, image_url: '/cover.png' }, stock: { quantity: 10, min_quantity: 2 }, images: [{ id: 1, image_url: '/cover.png' }, { id: 2, image_url: '/side.png' }] }, isPending: false } as never);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('reads the authenticated details and switches between deduplicated product images', async () => {
    await act(async () => root.render(<ProductDetailsDialog productId={10} onClose={jest.fn()} />));
    expect(useApiQuery).toHaveBeenCalledWith('/products/manage/10');
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Inativo');
    expect(dialog.querySelectorAll('[aria-pressed]')).toHaveLength(2);
    await act(async () => (dialog.querySelector('[aria-label="Ver imagem 2"]') as HTMLButtonElement).click());
    expect(dialog.querySelector('img[alt="Picanha"]')?.getAttribute('src')).toBe('/side.png');
  });
});
