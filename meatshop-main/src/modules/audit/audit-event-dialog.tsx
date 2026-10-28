"use client";

import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { formatDateTime } from "@/shared/lib/formatters";
import type { AuditLog } from "./types";

export function AuditEventDialog({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col gap-0 overflow-hidden bg-slate-50 p-0 sm:p-0">
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white p-5 pr-12 sm:p-6 sm:pr-12">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-red-50 p-2.5 text-red-700">
              <History className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-left text-xl font-bold text-slate-950">
                Evento #{log.id}
              </DialogTitle>
              <DialogDescription className="mt-1 break-words text-left text-sm text-slate-600">
                {log.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-950">Informações do evento</h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${log.outcome === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
              >
                {log.outcome === "SUCCESS" ? "Sucesso" : "Falha"}
              </span>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Data" value={formatDateTime(log.created_at)} />
              <Field label="Ação" value={log.action} />
              <Field
                label="Recurso"
                value={`${log.entity}${log.entity_id ? ` #${log.entity_id}` : ""}`}
              />
              <Field
                label="Responsável"
                value={
                  log.user?.name ?? (log.actor_type === "SYSTEM" ? "Sistema" : "Não identificado")
                }
              />
              <Field label="Unidade" value={log.unit?.name ?? "—"} />
              <Field label="Endereço IP" value={log.ip_address ?? "—"} />
              <Field label="Requisição" value={`${log.method ?? "—"} ${log.path ?? ""}`} />
              <Field label="Status HTTP" value={String(log.status_code ?? "—")} />
              <Field label="Correlação" value={log.correlation_id ?? "—"} />
            </dl>
          </section>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <Snapshot title="Antes" value={log.old_data} />
            <Snapshot title="Depois / contexto" value={log.new_data} />
          </div>
        </div>
        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white p-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-medium text-slate-800 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function Snapshot({ title, value }: { title: string; value: string | null }) {
  let formatted = value ?? "Sem dados registrados";
  if (value) {
    try {
      formatted = JSON.stringify(JSON.parse(value), null, 2);
    } catch {}
  }
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-950">
        {title}
      </h3>
      <pre className="max-h-80 overflow-auto bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
        {formatted}
      </pre>
    </section>
  );
}
