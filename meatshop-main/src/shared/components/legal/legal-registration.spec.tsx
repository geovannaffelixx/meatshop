import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LegalRegistration } from './legal-registration';
import { loadLegalCatalog } from '@/shared/legal/legal-api';

jest.mock('@/shared/legal/legal-api', () => ({ loadLegalCatalog: jest.fn() }));
jest.mock('./legal-documents', () => ({
  LegalDocuments: () => <button type="button">Consultar documento</button>,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('LegalRegistration', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.mocked(loadLegalCatalog).mockResolvedValue({
      enforced: true,
      documents: [1, 2, 3].map((id) => ({
        id,
        kind: 'document',
        title: 'Document',
        version: 'v1',
        content: 'Text',
        content_hash: 'hash',
      })),
    });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('requires separate explicit acceptance and representation confirmation', async () => {
    const onChange = jest.fn();
    await act(async () => root.render(<LegalRegistration onChange={onChange} />));
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect([...checkboxes].every((input) => !input.checked)).toBe(true);
    await act(async () => container.querySelector('button')!.click());
    expect(onChange).toHaveBeenLastCalledWith(null);
    await act(async () => checkboxes[0].click());
    expect(onChange).toHaveBeenLastCalledWith(null);
    await act(async () => checkboxes[1].click());
    expect(onChange).toHaveBeenLastCalledWith({
      accepted: true,
      authorized_representative: true,
      channel: 'web',
      document_ids: [1, 2, 3],
    });
    await act(async () => checkboxes[0].click());
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
