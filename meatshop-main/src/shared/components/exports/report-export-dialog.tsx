'use client';
import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, Download, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { usePanelAccess } from '@/shared/providers/panel-access-provider';
import { ReportFilters, ReportKind, reportFields, reportTitles } from './report-options';
import { ExportFilters, ExportFormat, ExportKind, ExportScope } from './export-form';
import { useExportForm } from './use-export-form';

type Props = {
  report: ReportKind;
  filters?: ReportFilters;
  label?: string;
};
type ContentProps = Props & { admin: boolean; currentUnit: number | null; unitName?: string };
type Form = ReturnType<typeof useExportForm>;

export function ReportExportDialog(props: Props) {
  const { user, selectedMembership, unitId } = usePanelAccess();
  const admin = user?.global_role === 'SUPER_ADMIN';
  if (!admin && (!unitId || !['OWNER', 'MANAGER'].includes(selectedMembership?.role ?? '')))
    return null;
  return (
    <ExportDialogContent
      key={`${user?.id}:${unitId}`}
      {...props}
      admin={admin}
      currentUnit={unitId}
      unitName={selectedMembership?.unit_name}
    />
  );
}

function ExportDialogContent(props: ContentProps) {
  const form = useExportForm(props.report, props.filters ?? {}, props.admin, props.currentUnit);
  return (
    <Dialog open={form.state.open} onOpenChange={form.changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Download aria-hidden="true" />
          {props.label ?? 'Exportar'}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden bg-slate-50 p-0 sm:p-0"
        showCloseButton={!form.busy}
      >
        <form
          aria-busy={form.busy}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={(event) => submit(event, form)}
        >
          <ExportHeading report={form.state.kind} />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <fieldset disabled={form.busy} className="min-w-0 space-y-4 disabled:opacity-70">
              <ExportBody {...props} form={form} />
            </fieldset>
            <ExportFeedback form={form} />
          </div>
          <ExportActions form={form} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExportHeading({ report }: { report: ReportKind }) {
  return (
    <DialogHeader className="shrink-0 border-b border-slate-200 bg-white p-5 pr-12 text-left sm:p-6 sm:pr-12">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700">
          <Download className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          <DialogTitle className="text-left text-xl font-bold tracking-tight text-slate-950">
            Exportar {reportTitles[report].toLowerCase()}
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-slate-600">
            {report === 'personal'
              ? 'Baixe uma cópia protegida dos dados pessoais vinculados à sua conta.'
              : 'Configure o arquivo com os registros correspondentes aos filtros selecionados.'}
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
  );
}

function ExportBody({ form, admin, report, unitName }: ContentProps & { form: Form }) {
  const common = { state: form.state, disabled: form.busy, onChange: form.change };
  const hasFilters = report === 'catalog' || reportFields(form.state.kind).length > 0;
  return (
    <>
      <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50/70 p-4 text-sm text-slate-700">
        <Info className="mt-0.5 size-4 shrink-0 text-red-700" aria-hidden="true" />
        <p className="leading-relaxed">
          {report === 'personal'
            ? 'O arquivo inclui atividades da sua conta em outras unidades e nunca inclui senhas ou tokens.'
            : 'A exportação inclui todos os resultados dos filtros, mesmo os que estão em outras páginas da listagem.'}
        </p>
      </div>

      <ExportSection title="Escopo" description="Confirme a origem dos dados que serão exportados.">
        <ExportScope {...common} admin={admin} units={form.units.data ?? []} unitName={unitName} />
        {admin && form.units.error && (
          <LoadError message="Não foi possível carregar as unidades." retry={form.units.refetch} />
        )}
      </ExportSection>

      {hasFilters && (
        <ExportSection
          title="Conteúdo"
          description="Ajuste os filtros usados somente neste arquivo."
        >
          {report === 'catalog' && <ExportKind {...common} />}
          <ExportFilters {...common} products={form.products.data ?? []} />
          {report === 'reviews' && form.products.error && (
            <LoadError
              message="Não foi possível carregar os produtos. A exportação geral continua disponível."
              retry={form.products.refetch}
            />
          )}
        </ExportSection>
      )}

      <ExportSection title="Formato" description="Escolha como deseja abrir e compartilhar o relatório.">
        <ExportFormat {...common} admin={admin} />
      </ExportSection>
    </>
  );
}

function ExportFeedback({ form }: { form: Form }) {
  return (
    <>
      {form.error && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">{form.error}</p>
        </div>
      )}
      {form.busy && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
        >
          <Spinner />
          <span>Preparando o arquivo com segurança. Isso pode levar alguns instantes.</span>
        </div>
      )}
    </>
  );
}

function ExportActions({ form }: { form: Form }) {
  return (
    <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
      <Button type="button" variant="outline" disabled={form.busy} onClick={() => form.changeOpen(false)}>
        Cancelar
      </Button>
      <Button type="submit" disabled={form.busy || !form.canDownload}>
        {form.busy ? <Spinner /> : <Download aria-hidden="true" />}
        {form.busy ? 'Preparando arquivo...' : 'Baixar arquivo'}
      </Button>
    </div>
  );
}

function ExportSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function LoadError({ message, retry }: { message: string; retry: () => unknown }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p>{message}</p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 font-semibold text-red-800 underline underline-offset-2 hover:text-red-950"
          onClick={() => void retry()}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function submit(event: FormEvent<HTMLFormElement>, form: Form) {
  event.preventDefault();
  if (!form.busy && form.canDownload) form.submit();
}
