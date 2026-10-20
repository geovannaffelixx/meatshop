import { useState } from 'react';
import { recordLegalAcceptance, type LegalDocument } from './legal-api';

export function useLegalSubmission(
  documents: LegalDocument[],
  unitId: number | undefined,
  onAccepted: () => void,
) {
  const [accepted, setAccepted] = useState(false);
  const [representative, setRepresentative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true);
    try {
      await recordLegalAcceptance(
        {
          accepted: true,
          channel: 'web',
          document_ids: documents.map((document) => document.id),
          ...(unitId ? { authorized_representative: true as const } : {}),
        },
        unitId,
      );
      onAccepted();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível registrar o aceite.');
      setAccepted(false);
      setRepresentative(false);
    } finally {
      setBusy(false);
    }
  };
  return { accepted, setAccepted, representative, setRepresentative, busy, error, submit };
}
