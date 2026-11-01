'use client';
import { ReportExportDialog } from '@/shared/components/exports/report-export-dialog';

export function ExportDataDialog() {
  return <ReportExportDialog report="personal" label="Exportar meus dados" />;
}
