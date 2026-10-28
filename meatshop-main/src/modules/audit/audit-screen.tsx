"use client";

import { useApiQuery } from "@/shared/hooks/use-api-query";
import { DataSkeleton } from "@/shared/components/data-skeleton";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { EmptyState } from "@/shared/components/empty-state";
import { SearchField } from "@/shared/components/search-field";
import { DataPagination } from "@/shared/components/data-pagination";
import { ReusableTable, type TableColumn } from "@/shared/components/reusable-table";
import { formatDateTime } from "@/shared/lib/formatters";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Eye, History } from "lucide-react";
import { API_URL, apiGet } from "@/shared/lib/api";
import { saveBlob } from "@/shared/lib/download";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import type { AuditLog, AuditResult, AuditSummary } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const emptyResult: AuditResult = {
  data: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};
const outcomeLabels = { SUCCESS: "Sucesso", FAILURE: "Falha" } as const;

export function AuditScreen() {
  const { user } = usePanelAccess();
  const [filters, setFilters] = useState({ search: "", outcome: "", date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const query = useMemo(() => buildQuery(filters, page), [filters, page]);

  const { data: result = emptyResult, isPending: loading } = useApiQuery<AuditResult>(
    user?.global_role === "SUPER_ADMIN" ? `/audit-logs?${query}` : null,
  );
  const {
    data: summary = { total: 0, success: 0, failure: 0, last24Hours: 0 },
    isPending: summaryLoading,
  } = useApiQuery<AuditSummary>(user?.global_role === "SUPER_ADMIN" ? "/audit-logs/summary" : null);

  const columns: TableColumn<AuditLog>[] = [
    {
      id: "date",
      header: "Data",
      accessor: (log) => formatDateTime(log.created_at),
      className: "whitespace-nowrap",
    },
    {
      id: "outcome",
      header: "Resultado",
      accessor: (log) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${log.outcome === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          {outcomeLabels[log.outcome]}
        </span>
      ),
    },
    { id: "action", header: "Ação", accessor: "action", className: "font-medium" },
    {
      id: "user",
      header: "Responsável",
      accessor: (log) =>
        log.user?.name ?? (log.actor_type === "SYSTEM" ? "Sistema" : "Não identificado"),
    },
    { id: "unit", header: "Unidade", accessor: (log) => log.unit?.name ?? "—" },
    {
      id: "entity",
      header: "Recurso",
      accessor: (log) => `${log.entity}${log.entity_id ? ` #${log.entity_id}` : ""}`,
    },
    {
      id: "details",
      header: <span className="sr-only">Detalhar</span>,
      textAlign: "end",
      accessor: (log) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Detalhar evento ${log.id}`}
          onClick={() => void apiGet(`/audit-logs/${log.id}`).then(setSelected)}
        >
          <Eye aria-hidden="true" />
        </Button>
      ),
    },
  ];

  return (
    <div className="page-surface">
      <div className="page-container">
        <PageHeader
          eyebrow="Administração"
          title="Auditoria da plataforma"
          description="Rastreabilidade de operações críticas, acessos e falhas."
          actions={
            user?.global_role === "SUPER_ADMIN" && (
              <Button type="button" variant="outline" onClick={() => void downloadCsv(query)}>
                <Download aria-hidden="true" />
                Exportar CSV
              </Button>
            )
          }
        />
        {user && user.global_role !== "SUPER_ADMIN" ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <EmptyState
              icon={History}
              title="Acesso restrito"
              description="Esta área é exclusiva da administração da plataforma."
            />
          </div>
        ) : (
          <>
            {summaryLoading ? (
              <DataSkeleton variant="cards" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric icon={History} label="Eventos" value={summary.total} />
                <Metric
                  icon={CheckCircle2}
                  label="Sucessos"
                  value={summary.success}
                  tone="text-emerald-700"
                />
                <Metric
                  icon={AlertTriangle}
                  label="Falhas"
                  value={summary.failure}
                  tone="text-red-700"
                />
                <Metric
                  icon={History}
                  label="Últimas 24h"
                  value={summary.last24Hours}
                  tone="text-blue-700"
                />
              </div>
            )}
            <Filters
              filters={filters}
              onChange={(next) => {
                setFilters(next as typeof filters);
                setPage(1);
              }}
            />
            <ReusableTable
              data={result.data}
              columns={columns}
              caption="Eventos de auditoria"
              keyExtractor={(log) => log.id}
              isLoading={loading}
              emptyMessage="Nenhum evento encontrado."
              footer={
                <DataPagination
                  page={page}
                  pageSize={result.meta.limit}
                  totalItems={result.meta.total}
                  totalPages={result.meta.totalPages}
                  onPageChange={setPage}
                  isLoading={loading}
                />
              }
            />
          </>
        )}
        {selected && <AuditDetail log={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function buildQuery(filters: Record<string, string>, page: number): string {
  const params = new URLSearchParams({ page: String(page), limit: "10" });
  Object.entries(filters).forEach(([key, value]) => {
    if (value)
      params.set(
        key,
        key.startsWith("date_")
          ? new Date(`${value}${key === "date_to" ? "T23:59:59" : "T00:00:00"}`).toISOString()
          : value,
      );
  });
  return params.toString();
}
async function downloadCsv(query: string) {
  const response = await fetch(`${API_URL}/audit-logs/export?${query}`, { credentials: "include" });
  if (!response.ok) return;
  saveBlob(await response.blob(), "auditoria-meatshop.csv");
}
function Metric({
  icon: Icon,
  label,
  value,
  tone = "text-slate-700",
}: {
  icon: typeof History;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className={`flex items-center gap-2 ${tone}`}>
        <Icon className="size-5" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <strong className="mt-2 block text-2xl">{value.toLocaleString("pt-BR")}</strong>
    </div>
  );
}
function Filters({
  filters,
  onChange,
}: {
  filters: Record<string, string>;
  onChange: (value: typeof filters) => void;
}) {
  return (
    <div className="grid items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_11rem_11rem]">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-700">Buscar eventos</p>
        <SearchField
          label="Buscar eventos"
          placeholder="Ação, recurso, usuário ou unidade"
          value={filters.search}
          onValueChange={(search) => onChange({ ...filters, search })}
        />
      </div>
      <label className="space-y-1.5 text-sm font-medium text-slate-700">
        Resultado
        <select
          value={filters.outcome}
          onChange={(e) => onChange({ ...filters, outcome: e.target.value })}
          className="input mt-1.5 h-11"
        >
          <option value="">Todos os resultados</option>
          <option value="SUCCESS">Sucesso</option>
          <option value="FAILURE">Falha</option>
        </select>
      </label>
      <label className="space-y-1.5 text-sm font-medium text-slate-700">
        Data inicial
        <Input
          className="mt-1.5 h-11"
          type="date"
          value={filters.date_from}
          onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
        />
      </label>
      <label className="space-y-1.5 text-sm font-medium text-slate-700">
        Data final
        <Input
          className="mt-1.5 h-11"
          type="date"
          value={filters.date_to}
          onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
        />
      </label>
    </div>
  );
}
function AuditDetail({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Evento #{log.id}</DialogTitle>
          <DialogDescription>{log.description}</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Field label="Data" value={formatDateTime(log.created_at)} />
          <Field
            label="HTTP"
            value={`${log.method ?? "—"} ${log.path ?? ""} · ${log.status_code ?? "—"}`}
          />
          <Field label="Correlação" value={log.correlation_id ?? "—"} />
          <Field label="Responsável" value={log.user?.name ?? "Não identificado"} />
          <Field label="IP" value={log.ip_address ?? "—"} />
          <Field label="Unidade" value={log.unit?.name ?? "—"} />
        </dl>
        <div className="grid gap-4 lg:grid-cols-2">
          <Snapshot title="Antes" value={log.old_data} />
          <Snapshot title="Depois / contexto" value={log.new_data} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-all font-medium">{value}</dd>
    </div>
  );
}
function Snapshot({ title, value }: { title: string; value: string | null }) {
  let formatted = value ?? "Sem dados";
  try {
    formatted = JSON.stringify(JSON.parse(value ?? "null"), null, 2);
  } catch {}
  return (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
        {formatted}
      </pre>
    </div>
  );
}
