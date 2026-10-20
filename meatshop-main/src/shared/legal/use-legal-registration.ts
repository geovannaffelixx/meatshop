import { useEffect, useState } from 'react';
import { loadLegalCatalog, type LegalAcceptance, type LegalCatalog } from './legal-api';

function useRegistrationCatalog() {
  const [catalog, setCatalog] = useState<LegalCatalog | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setError('');
    setCatalog(null);
    setAttempt((value) => value + 1);
  };
  useEffect(() => {
    let active = true;
    loadLegalCatalog(true)
      .then((value) => {
        if (active) setCatalog(value);
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar os documentos.');
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return { catalog, error, retry };
}

export function useLegalRegistration(onChange: (value: LegalAcceptance | null) => void) {
  const catalogState = useRegistrationCatalog();
  const [accepted, setAccepted] = useState(false);
  const [representative, setRepresentative] = useState(false);
  const { catalog } = catalogState;
  useEffect(() => {
    onChange(
      catalog && accepted && representative
        ? {
            accepted: true,
            channel: 'web',
            document_ids: catalog.documents.map((document) => document.id),
            authorized_representative: true,
          }
        : null,
    );
  }, [accepted, representative, catalog, onChange]);
  return { ...catalogState, accepted, setAccepted, representative, setRepresentative };
}
