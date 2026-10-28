"use client";

import { formatDateTime } from "@/shared/lib/formatters";

import { useApiQuery } from "@/shared/hooks/use-api-query";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { SupportTicketFormDialog } from "./support-ticket-form-dialog";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import {
  categoryLabels,
  priorityLabels,
  statusLabels,
  type SupportStatus,
  type SupportTicket,
} from "./types";

type SearchResult = { data: SupportTicket[]; total: number };

export function SupportListScreen() {
  const router = useRouter();
  const { user, unitId } = usePanelAccess();
  const isAdmin = user?.global_role === "SUPER_ADMIN";
  const [status, setStatus] = useState<SupportStatus | "">("");
  const [open, setOpen] = useState(false);

  const { data: result = { data: [], total: 0 }, isPending: loading, refetch: load, error } = useApiQuery<SearchResult>(`/support-tickets/search${status ? `?status=${status}` : ''}`);

  if (error) return <div className="p-8 text-red-700" role="alert">{error.message}<Button onClick={() => void load()}>Tentar novamente</Button></div>;

  return (
    <div className="page-surface">
    <section className="page-container">
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
          <DataSkeleton label="Carregando chamados..." />
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
                {formatDateTime(ticket.last_message_at)}
              </time>
            </button>
          ))
        )}
      </div>

      {open && <SupportTicketFormDialog open={open} setOpen={setOpen} unitId={unitId} />}
    </section>
    </div>
  );
}
