'use client';
import { useState } from 'react';
import { useApiQuery } from '@/shared/hooks/use-api-query';
import { useReportDownload } from './use-report-download';
import { ExportFormState } from './export-form';
import { ReportFilters, ReportKind } from './report-options';

export function useExportForm(
  report: ReportKind,
  filters: ReportFilters,
  admin: boolean,
  currentUnit: number | null,
) {
  const [state, setState] = useState<ExportFormState>({
    open: false,
    kind: report,
    values: filters,
    format: 'xlsx',
    unit: '',
  });
  const units = useApiQuery<{ id: number; name: string }[]>(
    admin && state.open ? '/exports/units' : null,
  );
  const download = useReportDownload();
  const unit = admin ? Number(state.unit) : currentUnit;
  const change = (patch: Partial<ExportFormState>) => {
    setState((current) => ({ ...current, ...patch }));
    download.clearError();
  };
  function changeOpen(open: boolean) {
    if (download.busy) return;
    change(open ? { open, kind: report, values: filters, unit: '', format: 'xlsx' } : { open });
  }
  return {
    state,
    units,
    change,
    changeOpen,
    ...download,
    canDownload: Boolean(unit && (!admin || units.data)),
    submit: () => unit && void download.download(state.kind, state.values, unit, state.format),
  };
}
