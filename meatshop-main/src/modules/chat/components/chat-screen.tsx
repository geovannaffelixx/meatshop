"use client";

import { formatDateValue } from "@/shared/lib/date-time";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { io } from "socket.io-client";
import { socketEndpoint } from "@/shared/config/api-url";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, Search, Truck, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { orderStatusLabel } from "@/modules/orders/utils/status-labels";
import { Input } from "@/shared/components/ui/input";

import { apiGet } from "@/shared/lib/api";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";
import { PageHeader } from "@/shared/components/page-header";
import { ChatThread } from "./chat-thread";
import type { ChatOrder, ChatParticipantType } from "../types";

import { DataPagination } from "@/shared/components/data-pagination";

const terminalStatuses = new Set(["DELIVERED", "CANCELLED"]);


export function ChatScreen() {
  const searchParams = useSearchParams();
  const { user, unitId } = usePanelAccess();
  const [orders, setOrders] = useState<ChatOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ChatOrder | null>(null);
  const selectedOrderId = selectedOrder?.id ?? null;
  const [activityVersion, setActivityVersion] = useState(0);
  const [channel, setChannel] = useState<ChatParticipantType>("UNIT");
  const [search, setSearch] = useState(searchParams.get("order") ?? "");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const media = window.matchMedia?.("(min-width: 1024px)");
    if (!media) return;
    const update = () => setDesktop(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({paginated: 'true', page: String(page), limit: '10', search: search.trim(), sort: 'chat_activity'});
    if (unitId !== null) params.set('unit_id', String(unitId));
    const url = '/orders?' + params;
    type OrderPage = {data: ChatOrder[]; meta: {total: number; totalPages: number}};
    const accept = (data: OrderPage) => {
      if (controller.signal.aborted) return;
      setError(null);
      setOrders(data.data);
      setTotal(data.meta.total);
      setTotalPages(data.meta.totalPages);
      if (page > data.meta.totalPages) { setPage(data.meta.totalPages); return; }
      const requestedId = Number(searchParams.get('order'));
      setSelectedOrder(current => data.data.find(order => order.id === current?.id)
        ?? current ?? data.data.find(order => order.id === requestedId) ?? null);
    };
    const timer = setTimeout(() => {
      void apiGet(url, {signal: controller.signal, silent: true})
        .then(accept)
        .catch(() => {
          if (!controller.signal.aborted) setError('Não foi possível carregar os pedidos para conversa.');
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    const refreshTimer = setInterval(() => {
      void apiGet(url, {signal: controller.signal, silent: true}).then(accept).catch(() => undefined);
    }, 10000);
    return () => { clearTimeout(timer); clearInterval(refreshTimer); controller.abort(); };
  }, [searchParams, unitId, search, page, activityVersion]);

  useEffect(() => {
    if (searchParams.get('channel') === 'UNIT_DELIVERY_PERSON') setChannel('UNIT_DELIVERY_PERSON');
  }, [searchParams]);

  useEffect(() => {
    if (unitId === null) return;
    const { url, ...endpoint } = socketEndpoint('/chat');
    const socket = io(url, { ...endpoint, withCredentials: true });
    socket.on('chat:ready', () => {
      socket.emit('chat:inbox:join', { unit_id: unitId });
      setActivityVersion(value => value + 1);
    });
    socket.on('chat:inbox:updated', (event: {unit_id: number; reason?: string}) => {
      if (event.unit_id !== unitId) return;
      if (event.reason !== 'read') setPage(1);
      setActivityVersion(value => value + 1);
    });
    return () => { socket.disconnect(); };
  }, [user?.id, unitId]);

  useEffect(() => {
    if (selectedOrder && (selectedOrder.delivery_type === "PICKUP" || !selectedOrder.delivery_person_id) && channel === "UNIT_DELIVERY_PERSON") {
      setChannel("UNIT");
    }
  }, [channel, selectedOrder]);

  const handleRead = useCallback((id: number, type: ChatParticipantType) => {
    const clear = (order: ChatOrder) => order.id !== id ? order : {...order, chat_unread: {
      client: type === 'UNIT' ? 0 : order.chat_unread?.client ?? 0,
      delivery: type === 'UNIT_DELIVERY_PERSON' ? 0 : order.chat_unread?.delivery ?? 0,
    }};
    setOrders(current => current.map(clear));
    setSelectedOrder(current => current ? clear(current) : null);
  }, []);

  function openOrder(order: ChatOrder, target?: ChatParticipantType) {
    setSelectedOrder(order);
    setChannel(target ?? ((order.chat_unread?.client ?? 0) > 0 ? 'UNIT' : (order.chat_unread?.delivery ?? 0) > 0 ? 'UNIT_DELIVERY_PERSON' : 'UNIT'));
    setMobileThreadOpen(true);
  }

  if (!user) return null;

  return (
    <div className="page-surface"><div className="page-container flex h-[calc(100dvh-5rem)] min-h-[32rem] flex-col">
      <div>
        <PageHeader eyebrow="Operação" title="Mensagens"
          description="Converse com clientes e entregadores em canais separados por pedido." />
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border bg-white shadow-sm lg:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className={`${mobileThreadOpen ? "hidden lg:flex" : "flex"} min-h-0 min-w-0 flex-col border-r bg-white`}>
          <div className="shrink-0 border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" />
              <Input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); setSelectedOrder(null); }}
                placeholder="Buscar pedido ou cliente"
                className="pl-9"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <DataSkeleton label="Carregando pedidos..." />
            ) : error ? (
              <p className="p-6 text-sm text-red-600">{error}</p>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <MessageSquare className="mx-auto mb-3 size-7" />
                Nenhum pedido encontrado.
              </div>
            ) : (
              orders.map((order) => {
                const active = order.id === selectedOrderId;
                return (
                  <div key={order.id} className="border-b">
                  <button
                    type="button"
                    onClick={() => {
                      openOrder(order);
                    }}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      active ? "border-l-4 border-l-red-600 bg-red-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate text-sm text-slate-900">
                        {order.client_name ?? `Cliente #${order.client_id}`}
                      </strong>
                      <span className="shrink-0 text-xs text-slate-600">#{order.id}</span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{orderStatusLabel(order.status, order.delivery_type)}</span>
                      <time>{formatDateValue(order.chat_last_message_at ?? order.order_date, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                    </span>
                  </button>
                  {((order.chat_unread?.client ?? 0) + (order.chat_unread?.delivery ?? 0)) > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 pb-3">
                      {(order.chat_unread?.client ?? 0) > 0 && <button type="button" onClick={() => openOrder(order, 'UNIT')} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700" aria-label={order.chat_unread!.client + ' mensagens não lidas do cliente no pedido ' + order.id}><UserRound className="size-3.5" />Cliente <strong>{order.chat_unread!.client > 99 ? '99+' : order.chat_unread!.client}</strong></button>}
                      {(order.chat_unread?.delivery ?? 0) > 0 && <button type="button" onClick={() => openOrder(order, 'UNIT_DELIVERY_PERSON')} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700" aria-label={order.chat_unread!.delivery + ' mensagens não lidas do entregador no pedido ' + order.id}><Truck className="size-3.5" />Entregador <strong>{order.chat_unread!.delivery > 99 ? '99+' : order.chat_unread!.delivery}</strong></button>}
                    </div>
                  )}
                  </div>
                );
              })
            )}
          </div>
          <DataPagination compact page={page} pageSize={10} totalItems={total} totalPages={totalPages} onPageChange={next => { setPage(next); setSelectedOrder(null); }} isLoading={loading} />
        </aside>

        <section className={`${mobileThreadOpen ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`}>
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
                  onClick={() => setMobileThreadOpen(false)}
                  className="mr-1 inline-flex size-10 items-center justify-center rounded-lg border text-slate-600 lg:hidden"
                  aria-label="Voltar para conversas"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("UNIT")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    channel === "UNIT" ? "bg-red-700 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <UserRound className="size-4" /> Cliente {(selectedOrder.chat_unread?.client ?? 0) > 0 && <span className="rounded-full bg-white px-1.5 text-red-700" aria-label="Mensagens não lidas do cliente">{selectedOrder.chat_unread!.client}</span>}
                </button>
                {selectedOrder.delivery_type !== "PICKUP" && <button
                  type="button"
                  disabled={!selectedOrder.delivery_person_id}
                  onClick={() => setChannel("UNIT_DELIVERY_PERSON")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45 ${
                    channel === "UNIT_DELIVERY_PERSON"
                      ? "bg-red-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                  title={selectedOrder.delivery_person_id ? undefined : "Aguardando entregador assumir o pedido"}
                >
                  <Truck className="size-4" /> Entregador {(selectedOrder.chat_unread?.delivery ?? 0) > 0 && <span className="rounded-full bg-white px-1.5 text-red-700" aria-label="Mensagens não lidas do entregador">{selectedOrder.chat_unread!.delivery}</span>}
                </button>}
                {selectedOrder.delivery_type === "PICKUP" && <span className="text-xs text-slate-600">Retirada no balcão · conversa com o cliente</span>}
                {selectedOrder.delivery_type !== "PICKUP" && !selectedOrder.delivery_person_id && (
                  <span className="text-xs text-slate-600">Disponível após atribuição do entregador</span>
                )}
              </div>
              {(desktop || mobileThreadOpen) && <ChatThread
                key={`${selectedOrder.id}:${channel}`}
                orderId={selectedOrder.id}
                participantType={channel}
                participantLabel={channel === "UNIT" ? selectedOrder.client_name?.trim() || "Cliente" : selectedOrder.delivery_person_name?.trim() || "Entregador"}
                currentUserId={user.id}
                onRead={handleRead}
                closed={terminalStatuses.has(selectedOrder.status)}
              />}
            </>
          )}
        </section>
      </div>
    </div></div>
  );
}
