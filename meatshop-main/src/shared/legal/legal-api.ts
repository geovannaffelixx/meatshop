import { apiGet, apiPost } from '@/shared/lib/api';

export type LegalDocument = {
  id: number;
  kind: string;
  title: string;
  version: string;
  content: string;
  content_hash: string;
};
export type LegalCatalog = { enforced: boolean; documents: LegalDocument[] };
export type LegalAcceptance = {
  accepted: true;
  channel: 'web';
  document_ids: number[];
  authorized_representative?: true;
};
export type AcceptanceHistory = {
  id: number;
  document_id: number;
  title: string;
  version: string;
  accepted_at: string;
  unit_id: number | null;
};

export const loadLegalCatalog = (establishment = false): Promise<LegalCatalog> =>
  apiGet(`/legal/documents${establishment ? '?audience=establishment' : ''}`, { silent: true });
export const loadLegalPending = (unitId?: number): Promise<LegalCatalog> =>
  apiGet(`/legal/pending${unitId ? `?unit_id=${unitId}` : ''}`, { silent: true });
export const loadLegalHistory = (): Promise<AcceptanceHistory[]> => apiGet('/legal/acceptances');
export const recordLegalAcceptance = (acceptance: LegalAcceptance, unitId?: number) =>
  apiPost('/legal/acceptances', { ...acceptance, ...(unitId ? { unit_id: unitId } : {}) });
