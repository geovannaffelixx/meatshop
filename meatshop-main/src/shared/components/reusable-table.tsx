import type { CSSProperties, ReactNode } from 'react';
import { DataSkeleton } from '@/shared/components/data-skeleton';
import { cn } from '@/shared/lib/utils';

export interface TableColumn<T> {
  id: string;
  header: ReactNode;
  accessor: keyof T | ((row: T) => ReactNode);
  textAlign?: 'start' | 'center' | 'end';
  maxWidth?: CSSProperties['maxWidth'];
  className?: string;
}

interface ReusableTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  caption: string;
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  footer?: ReactNode;
}

const alignment = { start: 'text-left', center: 'text-center', end: 'text-right' };

export function ReusableTable<T>({ data, columns, caption, keyExtractor, onRowClick, emptyMessage = 'Nenhum registro encontrado.', isLoading = false, footer }: ReusableTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="data-table" aria-busy={isLoading}>
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>{columns.map(column => <th key={column.id} scope="col" className={alignment[column.textAlign ?? 'start']}>{column.header}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={columns.length}><DataSkeleton label={`Carregando ${caption.toLocaleLowerCase('pt-BR')}`} /></td></tr> : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="p-10 text-center text-slate-500">{emptyMessage}</td></tr>
            ) : data.map(row => (
              <tr key={keyExtractor(row)} tabIndex={onRowClick ? 0 : undefined}
                className={cn(onRowClick && 'cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-600')}
                onClick={event => {
                  if ((event.target as HTMLElement).closest('a,button,input,select,textarea,[role="button"]')) return;
                  onRowClick?.(row);
                }}
                onKeyDown={event => {
                  if (onRowClick && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}>
                {columns.map(column => <td key={column.id} style={{ maxWidth: column.maxWidth }} className={cn(alignment[column.textAlign ?? 'start'], column.className)}>
                  {typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor] as ReactNode}
                </td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
