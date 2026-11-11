'use client';
import { Download } from 'lucide-react';
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
import { ReportFilters, ReportKind, reportTitles } from './report-options';
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
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
        showCloseButton={!form.busy}
      >
        <ExportHeading report={form.state.kind} />
        <ExportBody {...props} form={form} />
        <ExportFeedback form={form} />
      </DialogContent>
    </Dialog>
  );
}

function ExportHeading({ report }: { report: ReportKind }) {
  return (
    <DialogHeader>
      <DialogTitle>Exportar {reportTitles[report].toLowerCase()}</DialogTitle>
      <DialogDescription>
        {report === 'personal'
          ? 'Baixe uma cópia dos dados pessoais da sua conta. Ela também inclui suas atividades em outras unidades.'
          : 'Exporte todos os registros que correspondem aos filtros, incluindo outras páginas.'}
      </DialogDescription>
    </DialogHeader>
  );
}

function ExportBody({ form, admin, report, unitName }: ContentProps & { form: Form }) {
  const common = { state: form.state, disabled: form.busy, onChange: form.change };
  return (
    <>
      <ExportScope {...common} admin={admin} units={form.units.data ?? []} unitName={unitName} />
      {admin && form.units.error && (
        <p role="alert" className="text-sm text-red-700">
          Não foi possível carregar as unidades.{' '}
          <button type="button" onClick={() => void form.units.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {report === 'catalog' && <ExportKind {...common} />}
      <ExportFilters {...common} products={form.products.data ?? []} />
      {report === 'reviews' && form.products.error && (
        <p role="alert" className="text-sm text-red-700">
          Não foi possível carregar os produtos da unidade. A exportação geral continua disponível.{' '}
          <button type="button" onClick={() => void form.products.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      <ExportFormat {...common} admin={admin} />
    </>
  );
}

function ExportFeedback({ form }: { form: Form }) {
  return (
    <>
      {form.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {form.error}
        </p>
      )}
      <Button type="button" disabled={form.busy || !form.canDownload} onClick={form.submit}>
        {form.busy ? <Spinner /> : <Download aria-hidden="true" />}
        {form.busy ? 'Preparando arquivo...' : 'Baixar arquivo'}
      </Button>
      {form.busy && (
        <p role="status" className="text-sm text-slate-500">
          Aguarde enquanto preparamos o relatório.
        </p>
      )}
    </>
  );
}
