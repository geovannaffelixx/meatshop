"use client"

import { useApiQuery } from "@/shared/hooks/use-api-query";
import type { PageResult } from "@/shared/hooks/use-server-list";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiPatch } from "@/shared/lib/api"
import { ORDER_STATUS_LABELS } from "@/modules/orders/utils/status-labels"
import { Spinner } from "@/shared/components/ui/spinner"
import { DataPagination } from "@/shared/components/data-pagination"
import { formatCurrency, formatDate } from "@/shared/lib/formatters"
import { toast } from "@/shared/lib/toast"

interface Filters {
  orderDate: { from: string; to: string }
  scheduledDate: { from: string; to: string }
  status: string
  customer: { orderId: string; name: string }
}

interface OrdersTableProps {
  filters: Filters
  currentPage: number
  onPageChange: (page: number) => void
}

type Order = {
  id: number
  client_id: number
  client_name: string | null
  unit_id: number
  order_date: string
  status: string
  delivery_status: string | null
  delivery_type: string
  payment_method?: string | null
  payment_status: string
  total_amount: number
  scheduled_delivery_date: string | null
}

export function OrdersTable({ filters, currentPage, onPageChange }: OrdersTableProps) {
  const router = useRouter()
  const { unitId } = usePanelAccess();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const params = new URLSearchParams({ paginated: 'true', page: String(currentPage), limit: '10' });
  const values = { unit_id: unitId ? String(unitId) : '', search: filters.customer.name, order_id: filters.customer.orderId,
    status: filters.status, order_from: filters.orderDate.from, order_to: filters.orderDate.to,
    scheduled_from: filters.scheduledDate.from, scheduled_to: filters.scheduledDate.to };
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
  const query = useApiQuery<PageResult<Order>>(unitId ? `/orders?${params}` : null);
  const pageData = query.data?.data ?? [];
  const loading = query.isPending;
  const error = query.error?.message;
  const loadOrders = () => void query.refetch();
  const totalPages = query.data?.meta.totalPages ?? 1;
  useEffect(() => {
    if (query.data && currentPage > totalPages) onPageChange(totalPages);
  }, [currentPage, onPageChange, query.data, totalPages]);
  const handleConfirm = async (orderId: number) => {
    setConfirmingId(orderId)
    try {
      await apiPatch(`/orders/${orderId}/confirm`, {})
      toast.success("Pedido confirmado com sucesso.")
      loadOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar pedido.")
    } finally {
      setConfirmingId(null)
    }
  }

  if (loading) {
    return <DataSkeleton label="Carregando pedidos..." />
  }
  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="font-semibold text-red-700">{error}</p>
        <button type="button" onClick={loadOrders} className="mt-3 text-sm font-semibold text-red-700 hover:underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
      <table className="data-table">
        <caption className="sr-only">Pedidos encontrados</caption>
        <thead>
          <tr>
            <th scope="col">Pedido</th>
            <th scope="col">Cliente</th>
            <th scope="col">Data do pedido</th>
            <th scope="col">Data agendada</th>
            <th scope="col">Status</th>
            <th scope="col">Valor</th>
            <th scope="col">Entrega</th>
            <th scope="col" className="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {pageData.length > 0 ? (
            pageData.map((o) => (
              <tr key={o.id}>
                <td className="font-semibold text-slate-900">#{o.id}</td>
                <td>{o.client_name ?? `Cliente #${o.client_id}`}</td>
                <td className="whitespace-nowrap">{formatDate(o.order_date)}</td>
                <td className="whitespace-nowrap">{formatDate(o.scheduled_delivery_date)}</td>
                <td>
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td className="whitespace-nowrap font-medium">{formatCurrency(o.total_amount)}</td>
                <td>{o.delivery_type === "DELIVERY" ? "Entrega" : "Retirada"}</td>
                <td className="space-x-3 whitespace-nowrap text-right">
                  {o.status === "PENDING" && (["PAID","PARTIALLY_REFUNDED"].includes(o.payment_status) || (o.payment_status==="PENDING" && ["Cash", "Card on Delivery"].includes(o.payment_method ?? ""))) && (
                    <button
                      onClick={() => handleConfirm(o.id)}
                      disabled={confirmingId === o.id}
                      className="inline-flex items-center gap-1 text-green-700 font-semibold hover:underline disabled:opacity-50"
                    >
                      {confirmingId === o.id && <Spinner />}
                      {confirmingId === o.id ? "Confirmando..." : "Confirmar"}
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/orders/${o.id}`)}
                    className="font-semibold text-red-700 hover:underline"
                  >
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="p-10 text-center text-slate-500">
                Nenhum pedido encontrado com os filtros aplicados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <DataPagination
        page={currentPage}
        pageSize={10}
        totalItems={query.data?.meta.total ?? 0}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  )
}
