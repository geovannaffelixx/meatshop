'use client';

import { FileText, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import type { LegalDocument } from '@/shared/legal/legal-api';

type DocumentDialogProps = { document: LegalDocument | null; onClose: () => void };

export function LegalDocumentDialog({ document, onClose }: DocumentDialogProps) {
  return (
    <Dialog
      open={document !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[85dvh] max-h-[900px] flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 sm:p-0"
      >
        <DocumentHeader document={document} onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-5 py-6 sm:px-8 sm:py-8">
          <article className="space-y-6">
            {document?.content.split(/\n\n+/).map((block, index) => (
              <DocumentParagraph key={index} block={block} />
            ))}
          </article>
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
          <span className="text-xs text-slate-500">MeatShop · Termos e privacidade</span>
          <Button type="button" onClick={onClose}>
            Fechar documento
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function DocumentHeader({ document, onClose }: DocumentDialogProps) {
  return (
    <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 bg-slate-50 px-5 py-5 sm:gap-4 sm:px-8 sm:py-6">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700">
        <FileText className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
          Documento legal
        </p>
        <DialogTitle className="text-left text-lg font-bold leading-snug text-slate-950 sm:text-xl">
          {document?.title}
        </DialogTitle>
        <DialogDescription className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
          Versão {document?.version}
        </DialogDescription>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="-mr-2 -mt-1 shrink-0 text-slate-500 hover:bg-red-50 hover:text-red-700"
        aria-label="Fechar documento"
        onClick={onClose}
      >
        <X className="size-5" aria-hidden="true" />
      </Button>
    </header>
  );
}

function DocumentParagraph({ block }: { block: string }) {
  const [firstLine, ...remainingLines] = block.split('\n');
  const isHeading = /^\d{1,2}[.)]?\s+\S/.test(firstLine);
  if (!isHeading)
    return <p className="whitespace-pre-line text-sm leading-7 text-slate-600">{block}</p>;
  return (
    <section className="space-y-2">
      <h3 className="border-l-2 border-red-700 pl-3 text-sm font-semibold leading-6 text-slate-950">
        {firstLine}
      </h3>
      {remainingLines.length > 0 && (
        <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
          {remainingLines.join('\n')}
        </p>
      )}
    </section>
  );
}
