"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Search, Truck, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ORDER_STATUS_LABELS } from "@/modules/orders/utils/status-labels";
import { Input } from "@/shared/components/ui/input";
import { Spinner } from "@/shared/components/ui/spinner";
import { apiGet } from "@/shared/lib/api";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { ChatThread } from "./chat-thread";
import type { ChatOrder, ChatParticipantType } from "../types";

const terminalStatuses = new Set(["DELIVERED", "CANCELLED"]);

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ChatScreen() {
  const searchParams = useSearchParams();
  const { user, unitId } = usePanelAccess();
  const [orders, setOrders] = useState<ChatOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [channel, setChannel] = useState<ChatParticipantType>("UNIT");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void apiGet("/orders", { signal: controller.signal, silent: true })
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const available = (data as ChatOrder[]).filter(
          (order) => unitId === null || order.unit_id === unitId,
        );
        setOrders(available);
        const requestedId = Number(searchParams.get("order"));
        const requestedChannel = searchParams.get("channel");
        setSelectedOrderId(
          available.some((order) => order.id === requestedId)
            ? requestedId
            : available[0]?.id ?? null,
        );
        if (requestedChannel === "UNIT_DELIVERY_PERSON") {
          setChannel("UNIT_DELIVERY_PERSON");
        }
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setError("Não foi possível carregar os pedidos para conversa.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [searchParams, unitId]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return orders;
    return orders.filter((order) =>
      String(order.id).includes(term) ||
      (order.client_name ?? "").toLocaleLowerCase("pt-BR").includes(term),
    );
  }, [orders, search]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  useEffect(() => {
    if (selectedOrder && !selectedOrder.delivery_person_id && channel === "UNIT_DELIVERY_PERSON") {
      setChannel("UNIT");
    }
  }, [channel, selectedOrder]);

  if (!user) return null;

  return (
    <main className="flex min-h-[calc(100vh-6rem)] flex-col bg-slate-50 p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-950">Mensagens</h1>
        <p className="mt-1 text-sm text-slate-500">
          Converse com clientes e entregadores em canais separados por pedido.
        </p>
      </div>

      <div className="grid min-h-[42rem] flex-1 overflow-hidden rounded-2xl border bg-white shadow-sm lg:grid-cols-[21rem_1fr]">
        <aside className="flex min-h-0 flex-col border-r bg-white">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar pedido ou cliente"
                className="pl-9"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                <Spinner /> Carregando pedidos...
              </div>
            ) : error ? (
              <p className="p-6 text-sm text-red-600">{error}</p>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <MessageSquare className="mx-auto mb-3 size-7" />
                Nenhum pedido encontrado.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const active = order.id === selectedOrderId;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full border-b px-4 py-3 text-left transition-colors ${
                      active ? "border-l-4 border-l-red-600 bg-red-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate text-sm text-slate-900">
                        {order.client_name ?? `Cliente #${order.client_id}`}
                      </strong>
                      <span className="shrink-0 text-xs text-slate-400">#{order.id}</span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
                      <time>{dateFormatter.format(new Date(order.order_date))}</time>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          {!selectedOrder ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-500">
              <MessageSquare className="mb-3 size-9 text-slate-300" />
              <p className="font-medium text-slate-700">Selecione um pedido</p>
              <p className="mt-1 text-sm">A conversa será exibida aqui.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b bg-white px-5 py-3">
                <button
                  type="button"
                  onClick={() => setChannel("UNIT")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    channel === "UNIT" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <UserRound className="size-4" /> Cliente
                </button>
                <button
                  type="button"
                  disabled={!selectedOrder.delivery_person_id}
                  onClick={() => setChannel("UNIT_DELIVERY_PERSON")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45 ${
                    channel === "UNIT_DELIVERY_PERSON"
                      ? "bg-red-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                  title={selectedOrder.delivery_person_id ? undefined : "Aguardando entregador assumir o pedido"}
                >
                  <Truck className="size-4" /> Entregador
                </button>
                {!selectedOrder.delivery_person_id && (
                  <span className="text-xs text-slate-400">Disponível após atribuição do entregador</span>
                )}
              </div>
              <ChatThread
                key={`${selectedOrder.id}:${channel}`}
                orderId={selectedOrder.id}
                participantType={channel}
                participantLabel={channel === "UNIT" ? "Cliente" : "Entregador"}
                currentUserId={user.id}
                closed={terminalStatuses.has(selectedOrder.status)}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
