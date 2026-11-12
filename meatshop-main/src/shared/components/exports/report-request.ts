import { apiGet } from '@/shared/lib/api';
import { dateBoundaryToISO } from '@/shared/lib/date-time';
import { ReportFilters, ReportKind, reportFields } from './report-options';

export function requestReport(
  kind: ReportKind,
  values: ReportFilters,
  unitId: number,
  format: string,
  signal: AbortSignal,
): Promise<Blob> {
  const params = new URLSearchParams({ unit_id: String(unitId), format });
  for (const { key } of reportFields(kind)) if (values[key]) params.set(key, values[key]);
  if (kind === 'audit')
    for (const key of ['date_from', 'date_to']) {
      if (values[key]) params.set(key, dateBoundaryToISO(values[key], key === 'date_to'));
    }
  const path =
    kind === 'personal'
      ? '/users/me/export'
      : kind === 'audit'
        ? '/audit-logs/export'
        : '/exports/reports';
  if (!['personal', 'audit'].includes(kind)) params.set('report', kind);
  return apiGet(`${path}?${params}`, { cache: false, silent: true, responseType: 'blob', signal });
}
