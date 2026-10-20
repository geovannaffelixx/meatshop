'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadLegalCatalog, loadLegalPending, type LegalCatalog } from './legal-api';

type PendingState = { key: string; catalog: LegalCatalog | null };

export function useLegalPending(key: string, enabled: boolean, unitId?: number) {
  const [state, setState] = useState<PendingState | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => {
    setError('');
    setState(null);
    setAttempt((value) => value + 1);
  }, []);
  useEffect(() => {
    window.addEventListener('legal:required', reload);
    return () => window.removeEventListener('legal:required', reload);
  }, [reload]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchCatalog(unitId)
      .then((catalog) => {
        if (active) {
          setState({ key, catalog });
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Não foi possível verificar os documentos. Tente novamente.');
      });
    return () => {
      active = false;
    };
  }, [key, enabled, unitId, attempt]);
  return {
    catalog: state?.key === key ? state.catalog : null,
    loading: !state || state.key !== key,
    error,
    reload,
  };
}

async function fetchCatalog(unitId?: number) {
  const pending = await loadLegalPending(unitId);
  return pending.enforced && pending.documents.length ? loadLegalCatalog(Boolean(unitId)) : null;
}
