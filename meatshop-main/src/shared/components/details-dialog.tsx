"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { cn } from "@/shared/lib/utils";

export function DetailsDialog({ open, onOpenChange, title, description, icon: Icon, children, className }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={cn("flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 overflow-hidden bg-slate-50 p-0 sm:p-0", className)}>
      <DialogHeader className="shrink-0 border-b border-slate-200 bg-white p-5 pr-12 text-left sm:p-6 sm:pr-12">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700"><Icon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 space-y-1">
            <DialogTitle className="break-words text-left text-xl font-bold tracking-tight text-slate-950">{title}</DialogTitle>
            <DialogDescription className="text-left text-sm text-slate-600">{description}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white p-4 sm:px-6"><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></div>
    </DialogContent>
  </Dialog>;
}
