'use client';

import { useState } from 'react';
import { ArrowUpRight, FileText, ShieldCheck, Store } from 'lucide-react';
import { LegalDocumentDialog } from './legal-document-dialog';
export { LegalDocumentDialog } from './legal-document-dialog';
import type { LegalDocument } from '@/shared/legal/legal-api';

const documentPresentation: Record<string, { icon: typeof FileText; description: string }> = {
  PLATFORM_TERMS: { icon: FileText, description: 'Condições para utilizar a plataforma.' },
  PRIVACY_NOTICE: { icon: ShieldCheck, description: 'Informações sobre o uso dos seus dados.' },
  ESTABLISHMENT_TERMS: { icon: Store, description: 'Condições para operar seu estabelecimento.' },
};

export function LegalDocuments({ documents }: { documents: LegalDocument[] }) {
  const [selected, setSelected] = useState<LegalDocument | null>(null);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {documents.map((document) => (
          <LegalDocumentCard
            key={document.id}
            document={document}
            onOpen={() => setSelected(document)}
          />
        ))}
      </div>
      <LegalDocumentDialog document={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function LegalDocumentCard({ document, onOpen }: { document: LegalDocument; onOpen: () => void }) {
  const { icon: Icon, description } =
    documentPresentation[document.kind] ?? documentPresentation.PLATFORM_TERMS;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-red-200 hover:bg-red-50/40"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{document.title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span>
        <span className="mt-3 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          Versão {document.version}
        </span>
      </span>
      <ArrowUpRight
        className="mt-1 size-4 shrink-0 text-slate-400 group-hover:text-red-700"
        aria-hidden="true"
      />
    </button>
  );
}
