"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, LifeBuoy, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiUpload } from "@/shared/lib/api";
import { Spinner } from "@/shared/components/ui/spinner";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { toast } from "@/shared/lib/toast";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import {
  categoryLabels,
  priorityLabels,
  statusLabels,
  type SupportCategory,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from "./types";

type SearchResult = { data: SupportTicket[]; total: number };

const initialForm = {
  subject: "",
  description: "",
  category: "TECHNICAL" as SupportCategory,
  priority: "NORMAL" as SupportPriority,
  order_id: "",
};

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
      setResult(
        await apiGet(`/support-tickets/search${query}`, { silent: true }),
      );
    } catch {
      toast.error("Não foi possível carregar os chamados.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

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
      setOpen(false);
      router.push(`/support/${ticket.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-surface">
    <section className="page-container max-w-6xl">
      <PageHeader
        eyebrow={isAdmin ? "Administração" : "Atendimento"}
        title={isAdmin ? "Suporte MeatShop" : "Ajuda e suporte"}
        description={
          isAdmin
            ? "Atenda os usuários da plataforma e acompanhe a fila de chamados."
            : "Fale diretamente com a equipe da plataforma MeatShop."
        }
        actions={
          !isAdmin ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              Novo chamado
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700">
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as SupportStatus | "")
            }
            className="input mt-1 min-w-44"
          >
            <option value="">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto text-sm text-slate-500">
          {result.total} chamado(s)
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-10 text-center text-slate-500">
            Carregando chamados...
          </p>
        ) : result.data.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="Nenhum chamado encontrado"
            description="Os chamados que correspondem ao filtro aparecerão aqui."
          />
        ) : (
          result.data.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => router.push(`/support/${ticket.id}`)}
              className="grid w-full gap-2 border-b border-slate-200 p-4 text-left hover:bg-slate-50 md:grid-cols-[1fr_auto_auto]"
            >
              <span>
                <span className="flex flex-wrap items-center gap-2">
                  <strong>
                    #{ticket.id} · {ticket.subject}
                  </strong>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {statusLabels[ticket.status]}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {isAdmin && ticket.user
                    ? `${ticket.user.name} · ${ticket.user.email} · `
                    : ""}
                  {categoryLabels[ticket.category]}
                  {ticket.unit ? ` · ${ticket.unit.name}` : ""}
                </span>
              </span>
              <span
                className={`self-center rounded-full px-2 py-1 text-xs font-semibold ${
                  ticket.priority === "URGENT"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {priorityLabels[ticket.priority]}
              </span>
              <time className="self-center text-xs text-slate-400">
                {new Date(ticket.last_message_at).toLocaleString("pt-BR")}
              </time>
            </button>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={createTicket} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Novo chamado</DialogTitle>
              <DialogDescription>
                Descreva o que aconteceu para que a equipe possa ajudar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Categoria
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value as SupportCategory,
                    })
                  }
                  className="input mt-1"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Prioridade
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      priority: event.target.value as SupportPriority,
                    })
                  }
                  className="input mt-1"
                >
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium">
              Assunto
              <Input
                required
                maxLength={150}
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
                className="mt-1"
              />
            </label>
            <label className="block text-sm font-medium">
              Descrição
              <Textarea
                required
                maxLength={2000}
                rows={6}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="mt-1"
              />
            </label>
            <label className="block text-sm font-medium">
              Pedido relacionado (opcional)
              <Input
                type="number"
                min={1}
                value={form.order_id}
                onChange={(event) =>
                  setForm({ ...form, order_id: event.target.value })
                }
                className="mt-1"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 hover:bg-slate-50">
              <ImagePlus className="size-5" />
              {images.length
                ? `${images.length} imagem(ns) selecionada(s)`
                : "Adicionar até 4 imagens"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={(event) =>
                  setImages(Array.from(event.target.files ?? []).slice(0, 4))
                }
              />
            </label>
            {images.length > 0 && (
              <p className="text-xs text-slate-500">
                {images.map(({ name }) => name).join(", ")}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button disabled={saving}>
                {saving && <Spinner />}
                {saving ? "Enviando..." : "Enviar chamado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
    </div>
  );
}
