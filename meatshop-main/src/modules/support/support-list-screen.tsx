"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, LifeBuoy, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiUpload } from "@/shared/lib/api";
import { Spinner } from "@/shared/components/ui/spinner";
import { toast } from "@/shared/lib/toast";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { categoryLabels, priorityLabels, statusLabels, type SupportCategory, type SupportPriority, type SupportStatus, type SupportTicket } from "./types";

type SearchResult = { data: SupportTicket[]; total: number };
const initialForm = { subject: "", description: "", category: "TECHNICAL" as SupportCategory, priority: "NORMAL" as SupportPriority, order_id: "" };

export function SupportListScreen() {
  const router = useRouter();
  const { user, unitId } = usePanelAccess();
  const isAdmin = user?.global_role === "SUPER_ADMIN";
  const [result, setResult] = useState<SearchResult>({ data: [], total: 0 });
  const [status, setStatus] = useState<SupportStatus | "">("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = status ? `?status=${status}` : "";
      setResult(await apiGet(`/support-tickets/search${query}`, { silent: true }));
    } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  async function createTicket(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const ticket = await apiPost("/support-tickets", {
        ...form,
        unit_id: isAdmin ? undefined : unitId ?? undefined,
        order_id: form.order_id ? Number(form.order_id) : undefined,
      });
      if (images.length) {
        const data = new FormData();
        images.forEach((image) => data.append("images", image));
        await apiUpload(`/support-tickets/${ticket.id}/messages`, data);
      }
      toast.success("Chamado enviado para a equipe MeatShop.");
      router.push(`/support/${ticket.id}`);
    } catch { /* O cliente da API apresenta o erro. */ }
    finally { setSaving(false); }
  }

  return <section className="mx-auto max-w-6xl space-y-6 p-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">{isAdmin ? "Suporte MeatShop" : "Ajuda e suporte"}</h1><p className="text-sm text-slate-500">{isAdmin ? "Atenda os usuários da plataforma e acompanhe a fila de chamados." : "Fale diretamente com a equipe da plataforma MeatShop."}</p></div>{!isAdmin && <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"><Plus className="size-4" />Novo chamado</button>}</header>
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4"><label className="text-sm font-medium">Status</label><select value={status} onChange={(event) => setStatus(event.target.value as SupportStatus | "")} className="rounded-md border px-3 py-2 text-sm"><option value="">Todos</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="ml-auto text-sm text-slate-500">{result.total} chamado(s)</span></div>
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">{loading ? <p className="p-10 text-center text-slate-500">Carregando chamados...</p> : result.data.length === 0 ? <div className="flex flex-col items-center p-12 text-center text-slate-500"><LifeBuoy className="mb-3 size-10" /><p>Nenhum chamado encontrado.</p></div> : result.data.map((ticket) => <button key={ticket.id} onClick={() => router.push(`/support/${ticket.id}`)} className="grid w-full gap-2 border-b p-4 text-left hover:bg-slate-50 md:grid-cols-[1fr_auto_auto]"><div><div className="flex flex-wrap items-center gap-2"><strong>#{ticket.id} · {ticket.subject}</strong><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{statusLabels[ticket.status]}</span></div><p className="mt-1 text-sm text-slate-500">{isAdmin && ticket.user ? `${ticket.user.name} · ${ticket.user.email} · ` : ""}{categoryLabels[ticket.category]}{ticket.unit ? ` · ${ticket.unit.name}` : ""}</p></div><span className={`self-center rounded-full px-2 py-1 text-xs font-semibold ${ticket.priority === "URGENT" ? "bg-red-100 text-red-800" : "bg-amber-50 text-amber-800"}`}>{priorityLabels[ticket.priority]}</span><time className="self-center text-xs text-slate-400">{new Date(ticket.last_message_at).toLocaleString("pt-BR")}</time></button>)}</div>
    {open && <div role="dialog" aria-modal="true" aria-labelledby="new-ticket-title" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><form onSubmit={createTicket} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 id="new-ticket-title" className="text-xl font-bold">Novo chamado</h2><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Categoria<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SupportCategory })} className="mt-1 w-full rounded-md border px-3 py-2">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-medium">Prioridade<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as SupportPriority })} className="mt-1 w-full rounded-md border px-3 py-2">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label className="block text-sm font-medium">Assunto<input required maxLength={150} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2" /></label><label className="block text-sm font-medium">Descrição<textarea required maxLength={2000} rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2" /></label><label className="block text-sm font-medium">Pedido relacionado (opcional)<input type="number" min={1} value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2" /></label><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-slate-600"><ImagePlus className="size-5" />Adicionar até 4 imagens<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(e) => setImages(Array.from(e.target.files ?? []).slice(0, 4))} /></label>{images.length > 0 && <p className="text-xs text-slate-500">{images.map(({ name }) => name).join(", ")}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-md border px-4 py-2">Cancelar</button><button disabled={saving} className="flex items-center gap-2 rounded-md bg-red-700 px-5 py-2 font-semibold text-white disabled:opacity-50">{saving && <Spinner />}{saving ? "Enviando..." : "Enviar chamado"}</button></div></form></div>}
  </section>;
}
