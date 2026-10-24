'use client';

import { FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { toast } from '@/shared/lib/toast';

const formats = [
  { label: 'Excel', icon: FileSpreadsheet },
  { label: 'JSON', icon: FileJson },
  { label: 'PDF', icon: FileText },
];

export function ExportDataDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button type="button" variant="outline">Exportar meus dados</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar meus dados</DialogTitle>
          <DialogDescription>Como deseja exportar seus dados? Esta é uma prévia; os downloads serão disponibilizados em uma próxima versão.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {formats.map(({ label, icon: Icon }) => (
            <Button key={label} type="button" variant="outline" className="justify-start gap-3"
              onClick={() => toast.info(`Preparando download em ${label} (demonstração). Nenhum arquivo será baixado nesta versão.`)}>
              <Icon className="size-5 text-red-700" aria-hidden="true" />{label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
