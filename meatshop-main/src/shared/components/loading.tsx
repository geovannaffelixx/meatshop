import { Spinner } from '@/shared/components/ui/spinner';
import { LoadingPointer } from '@/shared/components/loading-pointer';

export function Loading({ label = 'Carregando...', variant = 'spinner' }: { label?: string; variant?: 'spinner' | 'dots' }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col items-center justify-center gap-4 p-4 text-sm text-slate-600">
      {variant === 'dots' ? <LoadingPointer /> : <Spinner className="size-6 text-red-600 motion-reduce:animate-none" />}
      <span>{label}</span>
    </div>
  );
}
