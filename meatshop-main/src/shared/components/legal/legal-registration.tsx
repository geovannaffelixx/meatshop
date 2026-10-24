'use client';

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { Button } from '@/shared/components/ui/button';
import { LegalDocuments } from './legal-documents';
import { LegalCheckbox } from './legal-checkbox';
import { useLegalRegistration } from '@/shared/legal/use-legal-registration';
import type { LegalAcceptance } from '@/shared/legal/legal-api';

export function LegalRegistration({
  onChange,
}: {
  onChange: (value: LegalAcceptance | null) => void;
}) {
  const { catalog, error, retry, accepted, setAccepted, representative, setRepresentative } =
    useLegalRegistration(onChange);
  if (error)
    return (
      <div role="alert">
        {error}
        <Button type="button" variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      </div>
    );
  if (!catalog) return <DataSkeleton label="Carregando documentos..." />;
  return (
    <fieldset className="space-y-4 rounded-xl border p-4">
      <legend className="px-2 font-medium">Termos e privacidade</legend>
      <LegalDocuments documents={catalog.documents} />
      <LegalCheckbox checked={accepted} onChange={setAccepted} required>
        Li e aceito os Termos de Uso e os Termos para Estabelecimentos e declaro ciência da Política
        de Privacidade.
      </LegalCheckbox>
      <LegalCheckbox checked={representative} onChange={setRepresentative} required>
        Declaro possuir autorização para representar este estabelecimento.
      </LegalCheckbox>
    </fieldset>
  );
}
