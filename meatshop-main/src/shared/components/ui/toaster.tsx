"use client";

import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { TOAST_EVENT, type ToastInput, type ToastVariant } from "@/shared/lib/toast";

type ToastItem = Required<Pick<ToastInput, "description" | "duration" | "variant">> &
  Pick<ToastInput, "title" | "action"> & { id: number };

const styles: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-red-200 bg-red-50 text-red-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  info: "border-blue-200 bg-blue-50 text-blue-950",
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

let nextId = 0;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastInput>).detail;
      const item: ToastItem = {
        id: ++nextId,
        description: detail.description,
        duration: detail.duration ?? 5000,
        title: detail.title,
        variant: detail.variant ?? "info",
        action: detail.action,
      };

      setItems((current) => [...current.slice(-3), item]);
      window.setTimeout(() => {
        setItems((current) => current.filter(({ id }) => id !== item.id));
      }, item.duration);
    };

    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
    >
      {items.map((item) => {
        const Icon = icons[item.variant];
        return (
          <div
            key={item.id}
            role={item.variant === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex animate-in slide-in-from-right-full gap-3 rounded-xl border p-4 shadow-lg",
              styles[item.variant],
            )}
          >
            <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              {item.title && <p className="font-semibold leading-5">{item.title}</p>}
              <p className="text-sm leading-5 opacity-90">{item.description}</p>
              {item.action && (
                <a className="mt-2 inline-block text-sm font-semibold underline" href={item.action.href}>
                  {item.action.label}
                </a>
              )}
            </div>
            <button
              type="button"
              aria-label="Fechar notificação"
              className="rounded-sm opacity-60 transition-opacity hover:opacity-100"
              onClick={() => setItems((current) => current.filter(({ id }) => id !== item.id))}
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
