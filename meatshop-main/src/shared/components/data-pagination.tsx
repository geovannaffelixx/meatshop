import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

type DataPaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  maxVisiblePages?: number;
};

export function DataPagination({ page, pageSize, totalItems, totalPages, onPageChange, isLoading = false, maxVisiblePages = 5 }: DataPaginationProps) {
  const lastPage = Math.max(1, Math.floor(totalPages) || 1);
  const current = Math.min(Math.max(Math.floor(page) || 1, 1), lastPage);
  const windowSize = Math.min(9, Math.max(1, Math.floor(maxVisiblePages) || 5));
  const start = Math.max(1, Math.min(current - Math.floor(windowSize / 2), lastPage - windowSize + 1));
  const end = Math.min(lastPage, start + windowSize - 1);
  const pages = Array.from(new Set([1, ...Array.from({ length: end - start + 1 }, (_, i) => start + i), lastPage]));
  const firstItem = totalItems === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastItem = Math.min(current * pageSize, totalItems);

  function goTo(next: number) {
    if (!isLoading && next !== current && next >= 1 && next <= lastPage) onPageChange(next);
  }

  return (
    <nav aria-label="Paginação" aria-busy={isLoading} className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
      <span className="shrink-0 text-center lg:text-left">{firstItem}–{lastItem} de {totalItems}</span>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" aria-label="Primeira página" disabled={current === 1 || isLoading} onClick={() => goTo(1)}><ChevronsLeft className="size-4" /></Button>
        <Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" aria-label="Página anterior" disabled={current === 1 || isLoading} onClick={() => goTo(current - 1)}><ChevronLeft className="size-4" /></Button>
        {pages.map((number, index) => (
          <span key={number} className="flex items-center gap-1.5">
            {index > 0 && number - pages[index - 1] > 1 && <span aria-hidden="true" className="px-1 text-slate-400">…</span>}
            <Button type="button" variant={number === current ? 'default' : 'outline'} size="icon" className="size-8 rounded-lg" aria-label={`Ir para página ${number}`} aria-current={number === current ? 'page' : undefined} disabled={isLoading} onClick={() => goTo(number)}>{number}</Button>
          </span>
        ))}
        <Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" aria-label="Próxima página" disabled={current === lastPage || isLoading} onClick={() => goTo(current + 1)}><ChevronRight className="size-4" /></Button>
        <Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" aria-label="Última página" disabled={current === lastPage || isLoading} onClick={() => goTo(lastPage)}><ChevronsRight className="size-4" /></Button>
      </div>
    </nav>
  );
}
