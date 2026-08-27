"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Eye, History, Search, X } from "lucide-react";
import { API_URL, apiGet } from "@/shared/lib/api";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import type { AuditLog, AuditResult, AuditSummary } from "./types";

const emptyResult: AuditResult = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
const outcomeLabels = { SUCCESS: "Sucesso", FAILURE: "Falha" } as const;

export function AuditScreen() {
  const { user } = usePanelAccess();
  const [result, setResult] = useState(emptyResult);
  const [summary, setSummary] = useState<AuditSummary>({ total: 0, success: 0, failure: 0, last24Hours: 0 });
  const [filters, setFilters] = useState({ search: "", outcome: "", date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const query = useMemo(() => buildQuery(filters, page), [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setResult(await apiGet(`/audit-logs?${query}`, { silent: true })); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { if (user?.global_role === "SUPER_ADMIN") void load(); }, [load, user?.global_role]);
  useEffect(() => { if (user?.global_role === "SUPER_ADMIN") void apiGet("/audit-logs/summary", { silent: true }).then(setSummary); }, [user?.global_role]);

  if (user && user.global_role !== "SUPER_ADMIN") return <div className="p-8 text-center text-slate-600">Esta área é exclusiva da administração da plataforma.</div>;
  return <section className="mx-auto max-w-7xl space-y-6 p-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Auditoria da plataforma</h1><p className="text-sm text-slate-500">Rastreabilidade de operações críticas, acessos e falhas.</p></div><button onClick={() => downloadCsv(query)} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"><Download className="size-4" />Exportar CSV</button></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={History} label="Eventos" value={summary.total} /><Metric icon={CheckCircle2} label="Sucessos" value={summary.success} tone="text-emerald-700" /><Metric icon={AlertTriangle} label="Falhas" value={summary.failure} tone="text-red-700" /><Metric icon={History} label="Últimas 24h" value={summary.last24Hours} tone="text-blue-700" /></div>
    <Filters filters={filters} onChange={(next) => { setFilters(next as typeof filters); setPage(1); }} />
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Data</th><th className="p-3">Resultado</th><th className="p-3">Ação</th><th className="p-3">Responsável</th><th className="p-3">Unidade</th><th className="p-3">Recurso</th><th className="p-3"><span className="sr-only">Detalhar</span></th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-10 text-center text-slate-500">Carregando eventos...</td></tr> : result.data.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-slate-500">Nenhum evento encontrado.</td></tr> : result.data.map((log) => <AuditRow key={log.id} log={log} onOpen={() => void apiGet(`/audit-logs/${log.id}`).then(setSelected)} />)}</tbody></table></div><Pagination result={result} page={page} setPage={setPage} /></div>
    {selected && <AuditDetail log={selected} onClose={() => setSelected(null)} />}
  </section>;
}

function buildQuery(filters: Record<string, string>, page: number): string {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, key.startsWith("date_") ? new Date(`${value}${key === "date_to" ? "T23:59:59" : "T00:00:00"}`).toISOString() : value); });
  return params.toString();
}
async function downloadCsv(query: string) {
  const response = await fetch(`${API_URL}/audit-logs/export?${query}`, { credentials: "include" });
  if (!response.ok) return;
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "auditoria-meatshop.csv"; anchor.click(); URL.revokeObjectURL(url);
}
function Metric({ icon: Icon, label, value, tone = "text-slate-700" }: { icon: typeof History; label: string; value: number; tone?: string }) { return <div className="rounded-xl border bg-white p-4 shadow-sm"><div className={`flex items-center gap-2 ${tone}`}><Icon className="size-5" /><span className="text-sm font-medium">{label}</span></div><strong className="mt-2 block text-2xl">{value.toLocaleString("pt-BR")}</strong></div>; }
function Filters({ filters, onChange }: { filters: Record<string, string>; onChange: (value: typeof filters) => void }) { return <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_12rem_10rem_10rem]"><label className="relative"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><input aria-label="Buscar" placeholder="Ação, recurso, usuário ou unidade" value={filters.search} onChange={(e) => onChange({ ...filters, search: e.target.value })} className="w-full rounded-md border py-2 pl-9 pr-3" /></label><select aria-label="Resultado" value={filters.outcome} onChange={(e) => onChange({ ...filters, outcome: e.target.value })} className="rounded-md border px-3 py-2"><option value="">Todos os resultados</option><option value="SUCCESS">Sucesso</option><option value="FAILURE">Falha</option></select><input aria-label="Data inicial" type="date" value={filters.date_from} onChange={(e) => onChange({ ...filters, date_from: e.target.value })} className="rounded-md border px-3 py-2" /><input aria-label="Data final" type="date" value={filters.date_to} onChange={(e) => onChange({ ...filters, date_to: e.target.value })} className="rounded-md border px-3 py-2" /></div>; }
function AuditRow({ log, onOpen }: { log: AuditLog; onOpen: () => void }) { return <tr className="border-t hover:bg-slate-50"><td className="whitespace-nowrap p-3">{new Date(log.created_at).toLocaleString("pt-BR")}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${log.outcome === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{outcomeLabels[log.outcome]}</span></td><td className="p-3 font-medium">{log.action}</td><td className="p-3">{log.user?.name ?? (log.actor_type === "SYSTEM" ? "Sistema" : "Não identificado")}</td><td className="p-3">{log.unit?.name ?? "—"}</td><td className="p-3">{log.entity}{log.entity_id ? ` #${log.entity_id}` : ""}</td><td className="p-3"><button onClick={onOpen} aria-label={`Detalhar evento ${log.id}`} className="rounded p-2 hover:bg-slate-100"><Eye className="size-4" /></button></td></tr>; }
function Pagination({ result, page, setPage }: { result: AuditResult; page: number; setPage: (page: number) => void }) { return <div className="flex items-center justify-between border-t p-3 text-sm"><span>{result.meta.total} evento(s)</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button><span>{page} de {result.meta.totalPages}</span><button disabled={page >= result.meta.totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Próxima</button></div></div>; }
function AuditDetail({ log, onClose }: { log: AuditLog; onClose: () => void }) { return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"><header className="flex justify-between gap-4"><div><h2 className="text-xl font-bold">Evento #{log.id}</h2><p className="text-sm text-slate-500">{log.description}</p></div><button onClick={onClose} aria-label="Fechar"><X /></button></header><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><Field label="Data" value={new Date(log.created_at).toLocaleString("pt-BR")} /><Field label="HTTP" value={`${log.method ?? "—"} ${log.path ?? ""} · ${log.status_code ?? "—"}`} /><Field label="Correlação" value={log.correlation_id ?? "—"} /><Field label="Responsável" value={log.user?.name ?? "Não identificado"} /><Field label="IP" value={log.ip_address ?? "—"} /><Field label="Unidade" value={log.unit?.name ?? "—"} /></dl><div className="mt-6 grid gap-4 lg:grid-cols-2"><Snapshot title="Antes" value={log.old_data} /><Snapshot title="Depois / contexto" value={log.new_data} /></div></div></div>; }
function Field({ label, value }: { label: string; value: string }) { return <div><dt className="text-slate-500">{label}</dt><dd className="break-all font-medium">{value}</dd></div>; }
function Snapshot({ title, value }: { title: string; value: string | null }) { let formatted = value ?? "Sem dados"; try { formatted = JSON.stringify(JSON.parse(value ?? "null"), null, 2); } catch {} return <div><h3 className="mb-2 font-semibold">{title}</h3><pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{formatted}</pre></div>; }
