import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LegalGate } from './legal-gate';
import { loadLegalPending } from '@/shared/legal/legal-api';

let pathname = '/products';
jest.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: () => ({ user: { id: 1 }, selectedMembership: { role: 'MANAGER' }, unitId: 6 }) }));
jest.mock('@/shared/legal/legal-api', () => ({ loadLegalPending: jest.fn(), loadLegalCatalog: jest.fn() }));

describe('Legal gate during panel navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    pathname = '/products';
    jest.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    jest.mocked(loadLegalPending).mockResolvedValue({ enforced: true, documents: [] });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('keeps the accepted context while navigating and rechecks a backend requirement', async () => {
    await act(async () => root.render(<LegalGate><p>Produtos</p></LegalGate>));
    expect(container.textContent).toBe('Produtos');
    pathname = '/categories';
    await act(async () => root.render(<LegalGate><p>Categorias</p></LegalGate>));
    expect(container.textContent).toBe('Categorias');
    expect(loadLegalPending).toHaveBeenCalledTimes(1);
    await act(async () => window.dispatchEvent(new Event('legal:required')));
    expect(loadLegalPending).toHaveBeenCalledTimes(2);
  });
});
