'use client';

import { Button } from '@/shared/components/ui/button';
import type { LegalDocument } from '@/shared/legal/legal-api';
import { useLegalSubmission } from '@/shared/legal/use-legal-submission';
import { LegalDocuments } from './legal-documents';
import { LegalCheckbox } from './legal-checkbox';

export function LegalConsent({
  documents,
  unitId,
  onAccepted,
}: {
  documents: LegalDocument[];
  unitId?: number;
  onAccepted: () => void;
}) {
  const { accepted, setAccepted, representative, setRepresentative, busy, error, submit } =
    useLegalSubmission(documents, unitId, onAccepted);
  return (
    <div className="space-y-5">
      <LegalDocuments documents={documents} />
      {error && (
        <div
          role="alert"
          className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
          <Button type="button" variant="outline" onClick={onAccepted}>
            Atualizar documentos
          </Button>
        </div>
      )}
      <LegalCheckbox checked={accepted} disabled={busy} onChange={setAccepted}>
        Li e aceito os termos apresentados e declaro ciência da Política de Privacidade.
      </LegalCheckbox>
      {unitId && (
        <LegalCheckbox checked={representative} disabled={busy} onChange={setRepresentative}>
          Declaro possuir autorização para representar esta unidade.
        </LegalCheckbox>
      )}
      <Button
        className="w-full sm:w-auto"
        disabled={busy || !accepted || Boolean(unitId && !representative)}
        onClick={() => void submit()}
      >
        {busy ? 'Registrando...' : 'Aceitar e continuar'}
      </Button>
    </div>
  );
}
