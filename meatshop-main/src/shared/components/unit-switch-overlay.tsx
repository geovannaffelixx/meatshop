'use client';

import { Loading } from '@/shared/components/loading';
import { useEffect, useRef } from 'react';
import { Building2 } from 'lucide-react';

export function UnitSwitchOverlay({ name }: { name: string }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="unit-switch-title" tabIndex={-1}
      className="fixed inset-0 z-[9999] grid place-items-center bg-slate-50 p-6 text-slate-950 outline-none">
      <div className="w-full max-w-sm text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-8 grid size-20 place-items-center rounded-3xl border border-red-100 bg-white shadow-sm">
          <Building2 className="size-9 text-red-600" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">MeatShop</p>
        <h2 id="unit-switch-title" className="text-2xl font-semibold">Trocando de unidade</h2>
        <p className="mt-3 break-words text-slate-600">{name}</p>
        <div className="mt-6"><Loading variant="dots" label="Preparando seu ambiente de trabalho…" /></div>
      </div>
    </div>
  );
}
