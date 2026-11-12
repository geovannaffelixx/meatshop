'use client';
import { useEffect, useRef, useState } from 'react';
import { requestReport } from './report-request';
import { getErrorMessage } from '@/shared/lib/api-error-translations';
import { saveBlob } from '@/shared/lib/download';
import { toast } from '@/shared/lib/toast';
import { ReportFilters, ReportKind } from './report-options';

export function useReportDownload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function download(kind: ReportKind, values: ReportFilters, unitId: number, format: string) {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError(null);
    try {
      const file = await requestReport(kind, values, unitId, format, request.signal);
      if (request.signal.aborted) return;
      saveBlob(
        file,
        `meatshop-${kind}-unidade-${unitId}-${new Date().toISOString().slice(0, 10)}.${format}`,
      );
      toast.success('Seu arquivo está pronto. Download iniciado.');
    } catch (failure) {
      if (!request.signal.aborted)
        setError(
          getErrorMessage(
            failure,
            'Não foi possível exportar. Confira sua conexão e tente novamente.',
          ),
        );
    } finally {
      if (!request.signal.aborted) {
        setBusy(false);
        controller.current = null;
      }
    }
  }
  return { busy, error, download, clearError: () => setError(null) };
}
