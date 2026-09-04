"use client";

/* Attachments use authenticated runtime URLs that are intentionally not optimized by Next.js. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, LockKeyhole, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_URL, apiGet, apiPatch, apiUpload } from "@/shared/lib/api";
import { Spinner } from "@/shared/components/ui/spinner";
import { toast } from "@/shared/lib/toast";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { categoryLabels, priorityLabels, statusLabels, type SupportTicket } from "./types";

export function SupportDetailScreen({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const { user } = usePanelAccess();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTicket(await apiGet(`/support-tickets/${ticketId}`, { silent: true })); }
    finally { setLoading(false); }
  }, [ticketId]);
  useEffect(() => { void load(); }, [load]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim() && images.length === 0) return;
    setSending(true);
    try {
      const data = new FormData();
      if (message.trim()) data.append("message", message.trim());
      images.forEach((image) => data.append("images", image));
      await apiUpload(`/support-tickets/${ticketId}/messages`, data);
      setMessage(""); setImages([]);
      toast.success("Mensagem enviada.");
      await load();
    } catch { /* O cliente da API apresenta o erro. */ }
    finally { setSending(false); }
  }

  async function changeLifecycle(action: "close" | "reopen") {
    try {
      await apiPatch(`/support-tickets/${ticketId}/${action}`, {});
      toast.success(action === "close" ? "Chamado encerrado." : "Chamado reaberto.");
      await load();
    } catch { /* O cliente da API apresenta o erro. */ }
  }

  if (loading && !ticket) return <div className="grid min-h-[60vh] place-items-center text-slate-500">Carregando chamado...</div>;
  if (!ticket) return <div className="p-8 text-center text-slate-500">Chamado não encontrado.</div>;
  const closed = ticket.status === "CLOSED";

  return <section className="mx-auto max-w-5xl p-6"><button onClick={() => router.push("/support")} className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-red-700"><ArrowLeft className="size-4" />Voltar aos chamados</button><div className="grid gap-6 lg:grid-cols-[1fr_18rem]"><main className="overflow-hidden rounded-xl border bg-white shadow-sm"><header className="border-b p-5"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">#{ticket.id} · {ticket.subject}</h1><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{statusLabels[ticket.status]}</span></div>{user?.global_role === "SUPER_ADMIN" && ticket.user && <p className="mt-2 text-sm text-slate-500">Solicitante: {ticket.user.name} · {ticket.user.email}</p>}</header><div className="max-h-[55vh] space-y-4 overflow-y-auto bg-slate-50 p-5">{ticket.messages?.map((item) => { const mine = item.sender_id === user?.id; return <article key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-xl px-4 py-3 shadow-sm ${mine ? "bg-red-700 text-white" : "border bg-white text-slate-800"}`}><p className={`mb-1 text-xs font-semibold ${mine ? "text-red-100" : "text-slate-500"}`}>{item.sender.global_role === "SUPER_ADMIN" ? "Equipe MeatShop" : item.sender.name}</p>{item.message && <p className="whitespace-pre-wrap text-sm">{item.message}</p>}{item.attachments?.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{item.attachments.map((attachment) => <a key={attachment.id} href={`${API_URL}${attachment.file_url}`} target="_blank" rel="noreferrer"><img src={`${API_URL}${attachment.file_url}`} alt={attachment.original_name} className="max-h-48 w-full rounded-lg object-cover" /></a>)}</div>}<time className={`mt-2 block text-[11px] ${mine ? "text-red-100" : "text-slate-400"}`}>{new Date(item.created_at).toLocaleString("pt-BR")}</time></div></article>; })}</div>{closed ? <div className="flex items-center justify-between gap-4 border-t p-5"><p className="flex items-center gap-2 text-sm text-slate-500"><LockKeyhole className="size-4" />Este chamado está encerrado.</p><button onClick={() => void changeLifecycle("reopen")} className="rounded-md border px-4 py-2 text-sm font-medium">Reabrir chamado</button></div> : <form onSubmit={sendMessage} className="space-y-3 border-t p-4"><textarea aria-label="Mensagem" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={3} placeholder={user?.global_role === "SUPER_ADMIN" ? "Responda como equipe MeatShop..." : "Escreva uma mensagem para o suporte..."} className="w-full resize-none rounded-lg border px-3 py-2" /><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"><ImagePlus className="size-4" />{images.length ? `${images.length} imagem(ns)` : "Anexar imagens"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(event) => setImages(Array.from(event.target.files ?? []).slice(0, 4))} /></label><button disabled={sending || (!message.trim() && images.length === 0)} className="flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{sending ? <Spinner /> : <Send className="size-4" />}{sending ? "Enviando..." : "Enviar"}</button></div></form>}</main><aside className="h-fit space-y-4 rounded-xl border bg-white p-5"><h2 className="font-semibold">Detalhes</h2><dl className="space-y-3 text-sm"><div><dt className="text-slate-500">Categoria</dt><dd className="font-medium">{categoryLabels[ticket.category]}</dd></div><div><dt className="text-slate-500">Prioridade</dt><dd className="font-medium">{priorityLabels[ticket.priority]}</dd></div>{ticket.unit && <div><dt className="text-slate-500">Unidade</dt><dd className="font-medium">{ticket.unit.name}</dd></div>}{ticket.order_id && <div><dt className="text-slate-500">Pedido</dt><dd className="font-medium">#{ticket.order_id}</dd></div>}<div><dt className="text-slate-500">Aberto em</dt><dd>{new Date(ticket.created_at).toLocaleString("pt-BR")}</dd></div></dl>{!closed && <button onClick={() => void changeLifecycle("close")} className="w-full rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Encerrar chamado</button>}</aside></div></section>;
}
