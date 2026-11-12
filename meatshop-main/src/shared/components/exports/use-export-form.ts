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
  const products = useApiQuery<{ id: number; name: string }[]>(
    state.open && report === 'reviews' && unit
      ? `/exports/review-products?unit_id=${unit}`
      : null,
  );
  const change = (patch: Partial<ExportFormState>) => {
    setState((current) => ({
      ...current,
      ...patch,
      values:
        report === 'reviews' && patch.unit !== undefined && patch.values === undefined
          ? { ...current.values, product_id: 'all' }
          : (patch.values ?? current.values),
    }));
    download.clearError();
  };
  function changeOpen(open: boolean) {
    if (download.busy) return;
    change(
      open
        ? {
            open,
            kind: report,
            values: admin && report === 'reviews' ? { ...filters, product_id: 'all' } : filters,
            unit: '',
            format: 'xlsx',
          }
        : { open },
    );
  }
  return {
    state,
    units,
    products,
    change,
    changeOpen,
    ...download,
    canDownload: Boolean(unit && (!admin || units.data)),
    submit: () => unit && void download.download(state.kind, state.values, unit, state.format),
  };
}
