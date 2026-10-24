import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

export function DataSkeleton({ variant = 'list', label = 'Carregando dados', className }: {
  variant?: 'list' | 'form' | 'cards';
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} className={cn('w-full space-y-4 p-6', className)}>
      <span className="sr-only">{label}</span>
      {variant === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-slate-200/70" />)}
        </div>
      ) : (
        <>
          <Skeleton className="h-5 w-40 bg-slate-200/70" />
          {Array.from({ length: variant === 'form' ? 4 : 5 }, (_, i) => (
            <div key={i} className="flex gap-4">
              {variant === 'list' && <Skeleton className="size-10 shrink-0 rounded-xl bg-slate-200/70" />}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 bg-slate-200/70" />
                <Skeleton className={cn('bg-slate-200/70', variant === 'form' ? 'h-10 w-full' : 'h-3 w-1/3')} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
