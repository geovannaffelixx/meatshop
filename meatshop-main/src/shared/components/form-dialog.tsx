"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { RequiredMark } from "./ui/required-mark";
import { cn } from "@/shared/lib/utils";

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  children,
  onSubmit,
  saving,
  submitLabel,
  error,
  submitDisabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  submitLabel: string;
  error?: string | null;
  submitDisabled?: boolean;
}) {
  const errorNotice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorNotice.current?.focus();
  }, [error]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden bg-slate-50 p-0 sm:p-0"
        showCloseButton={!saving}
      >
        <form
          onSubmit={onSubmit}
          aria-busy={saving}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogHeader className="shrink-0 border-b border-slate-200 bg-white p-5 pr-12 text-left sm:p-6 sm:pr-12">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-left text-xl font-bold tracking-tight text-slate-950">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-left text-sm text-slate-600">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <p className="mb-4 text-xs text-slate-500">
              Os campos com <span className="font-semibold text-red-700">*</span> são obrigatórios.
            </p>
            {error && (
              <div
                ref={errorNotice}
                tabIndex={-1}
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 focus-visible:outline-red-700"
              >
                {error}
              </div>
            )}
            <fieldset disabled={saving} className="min-w-0 space-y-4 disabled:opacity-70">
              {children}
            </fieldset>
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || submitDisabled}>
              {saving && <Spinner />}
              {saving ? "Salvando..." : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 pb-4">
      <legend className="px-1 pt-1 text-sm font-semibold text-slate-950">{title}</legend>
      {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function FormField({
  label,
  required = false,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn("block min-w-0 space-y-1.5 text-sm font-medium text-slate-700", className)}
    >
      <span className="block">
        {label}
        {required && <RequiredMark />}
      </span>
      {children}
      {hint && (
        <span className="block text-xs font-normal leading-relaxed text-slate-500">{hint}</span>
      )}
    </label>
  );
}

export function FormActiveToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-red-700 focus-visible:outline-red-700"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span>
      </span>
    </label>
  );
}
