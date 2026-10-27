'use client';

import { useState } from 'react';
import { FileJson } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { apiGet } from '@/shared/lib/api';
import { getErrorMessage } from '@/shared/lib/api-error-translations';
import { saveBlob } from '@/shared/lib/download';
import { toast } from '@/shared/lib/toast';

const EXPORT_FILENAME = 'meatshop-meus-dados.json';

function useExportPersonalData() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    setError(null);
    try {
      const data: unknown = await apiGet('/users/me/export', { cache: false, silent: true });
      saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), EXPORT_FILENAME);
      toast.success('Download dos seus dados iniciado.');
    } catch (exportError) {
      setError(getErrorMessage(exportError, 'Não foi possível exportar seus dados. Tente novamente.'));
    } finally {
      setExporting(false);
    }
  }

  return { exporting, error, exportData };
}

export function ExportDataDialog() {
  const { exporting, error, exportData } = useExportPersonalData();
  return (
    <Dialog>
      <DialogTrigger asChild><Button type="button" variant="outline">Exportar meus dados</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar meus dados</DialogTitle>
          <DialogDescription>Baixe uma cópia dos dados pessoais vinculados à sua conta em formato JSON.</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="button" variant="outline" className="justify-start gap-3" disabled={exporting} onClick={() => void exportData()}>
          {exporting ? <Spinner /> : <FileJson className="size-5 text-red-700" aria-hidden="true" />}
          {exporting ? 'Preparando arquivo...' : 'Baixar arquivo JSON'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
