'use client';

import { FileCheck2, History, ArrowUpRight } from 'lucide-react';
import { LegalDocumentDialog, LegalDocuments } from '@/shared/components/legal/legal-documents';
import { PageHeader } from '@/shared/components/page-header';
import { EmptyState } from '@/shared/components/empty-state';
import { Button } from '@/shared/components/ui/button';
import { useLegalHistory } from '@/shared/legal/use-legal-history';
import type { AcceptanceHistory } from '@/shared/legal/legal-api';

export default function LegalHistoryPage() {
  const { documents, history, viewed, error, openVersion, closeVersion } = useLegalHistory();
  return (
    <div className="page-surface">
      <div className="page-container max-w-5xl">
        <PageHeader
          eyebrow="Configurações"
          title="Termos e privacidade"
          description="Consulte os documentos da plataforma e acompanhe suas confirmações."
        />
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <section className="space-y-5 rounded-xl border bg-white p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Documentos vigentes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Leia as condições de uso e saiba como seus dados são tratados.
            </p>
          </div>
          <LegalDocuments documents={documents} />
        </section>
        <section className="overflow-hidden rounded-xl border bg-white">
          <HistoryHeading />
          <LegalHistoryList history={history} onOpen={openVersion} />
        </section>
        <LegalDocumentDialog document={viewed} onClose={closeVersion} />
      </div>
    </div>
  );
}

function LegalHistoryList({
  history,
  onOpen,
}: {
  history: AcceptanceHistory[];
  onOpen: (id: number) => Promise<void>;
}) {
  if (!history.length)
    return (
      <EmptyState
        icon={FileCheck2}
        title="Nenhuma confirmação registrada"
        description="Suas confirmações aparecerão aqui após o aceite dos documentos."
      />
    );
  return (
    <ul className="divide-y divide-slate-200">
      {history.map((record) => (
        <li
          key={record.id}
          className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{record.title}</p>
            <p className="mt-1 text-sm text-slate-500">
              Versão {record.version} · {new Date(record.accepted_at).toLocaleString('pt-BR')}
              {record.unit_id ? ` · Unidade ${record.unit_id}` : ''}
            </p>
          </div>
          <Button
            variant="outline"
            className="self-start sm:self-auto"
            onClick={() => void onOpen(record.document_id)}
          >
            Ver documento
            <ArrowUpRight aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function HistoryHeading() {
  return (
    <div className="flex items-center gap-3 border-b p-5 sm:p-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700">
        <History className="size-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Meu histórico</h2>
        <p className="mt-1 text-sm text-slate-600">
          Versões confirmadas por você e datas dos registros.
        </p>
      </div>
    </div>
  );
}
