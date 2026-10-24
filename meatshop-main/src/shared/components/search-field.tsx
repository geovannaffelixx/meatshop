'use client';

import { useId, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type SearchFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
};

export function SearchField({ value, onValueChange, label, placeholder = 'Digite para buscar...', className }: SearchFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={cn('group flex h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm transition focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 hover:border-slate-300', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400 group-focus-within:text-red-600" />
      <input ref={input} id={id} type="search" value={value} onChange={event => onValueChange(event.target.value)}
        placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none" />
      {value && <button type="button" aria-label={`Limpar ${label.toLocaleLowerCase('pt-BR')}`}
        onClick={() => { onValueChange(''); input.current?.focus(); }}
        className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-red-600">
        <X className="size-4" aria-hidden="true" />
      </button>}
    </div>
  );
}
