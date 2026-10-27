'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { apiPatch } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';

type UnitStatusToggleProps = {
  unitId: number;
  isActive: boolean;
  canManage: boolean;
  onChanged: (isActive: boolean) => void;
};

export function UnitStatusBadge({ isActive }: { isActive: boolean }) {
  const tone = isActive ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-slate-300';
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>{isActive ? 'Unidade ativa' : 'Unidade inativa'}</span>;
}

function useUnitStatus(unitId: number, onChanged: (isActive: boolean) => void) {
  const [saving, setSaving] = useState(false);
  async function changeStatus(isActive: boolean): Promise<boolean> {
    setSaving(true);
    try {
      await apiPatch(`/units/${unitId}/status`, { is_active: isActive });
      toast.success(isActive ? 'Unidade reativada. Ela volta a aparecer para os clientes.' : 'Unidade desativada. Ela não aparece mais para os clientes.');
      onChanged(isActive);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }
  return { saving, changeStatus };
}

export function UnitStatusToggle({ unitId, isActive, canManage, onChanged }: UnitStatusToggleProps) {
  const [open, setOpen] = useState(false);
  const { saving, changeStatus } = useUnitStatus(unitId, onChanged);
  const nextStatus = !isActive;
  async function confirm() {
    if (await changeStatus(nextStatus)) setOpen(false);
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <UnitStatusBadge isActive={isActive} />
      {canManage && <Button type="button" variant="outline" onClick={() => setOpen(true)}>{isActive ? 'Desativar unidade' : 'Reativar unidade'}</Button>}
      <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isActive ? 'Desativar unidade?' : 'Reativar unidade?'}</DialogTitle>
            <DialogDescription>{isActive ? 'A unidade deixará de aparecer na busca e não receberá novos pedidos até ser reativada.' : 'A unidade voltará a aparecer para os clientes e poderá receber novos pedidos.'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant={isActive ? 'destructive' : 'default'} disabled={saving} onClick={() => void confirm()}>
              {saving && <Spinner />}
              {saving ? 'Salvando...' : isActive ? 'Desativar' : 'Reativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
