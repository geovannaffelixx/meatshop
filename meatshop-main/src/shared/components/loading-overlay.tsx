import { Spinner } from "@/shared/components/ui/spinner";

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
      <div className="flex min-w-56 flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-8 py-7 text-center shadow-xl shadow-slate-950/10">
        <div className="grid size-12 place-items-center rounded-full bg-red-50 text-red-700">
          <Spinner className="size-6" />
        </div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>
    </div>
  );
}
