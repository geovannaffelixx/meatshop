import { DataSkeleton } from '@/shared/components/data-skeleton';

type LoadingOverlayProps = {
  title: string;
};

export function LoadingOverlay({ title }: LoadingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-white/80 p-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10">
        <DataSkeleton variant="form" label={title} />
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>
    </div>
  );
}
