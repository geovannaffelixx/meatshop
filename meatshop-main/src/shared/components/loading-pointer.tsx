import { cn } from '@/shared/lib/utils';

export function LoadingPointer({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex items-center gap-1.5 text-red-600', className)}>
      {[0, 150, 300].map(delay => <span key={delay} className="size-2 rounded-full bg-current motion-safe:animate-bounce"
        style={{ animationDelay: `${delay}ms` }} />)}
    </span>
  );
}
