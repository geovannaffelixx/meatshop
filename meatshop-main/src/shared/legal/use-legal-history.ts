import { useEffect, useState } from 'react';
import { apiGet } from '@/shared/lib/api';
import {
  loadLegalCatalog,
  loadLegalHistory,
  type AcceptanceHistory,
  type LegalDocument,
} from './legal-api';

export function useLegalHistory() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [history, setHistory] = useState<AcceptanceHistory[]>([]);
  const [viewed, setViewed] = useState<LegalDocument | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([loadLegalCatalog(true), loadLegalHistory()])
      .then(([catalog, records]) => {
        if (active) {
          setDocuments(catalog.documents);
          setHistory(records);
        }
      })
      .catch(() => {
        if (active)
          setError(
            'Não foi possível carregar os documentos. Atualize a página para tentar novamente.',
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const openVersion = async (id: number) => {
    try {
      setViewed((await apiGet(`/legal/documents/${id}`)) as LegalDocument);
    } catch {
      setError('Não foi possível abrir a versão solicitada.');
    }
  };
  return { documents, history, viewed, error, openVersion, closeVersion: () => setViewed(null) };
}
