"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { apiGet, apiPatch } from "@/shared/lib/api"
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
  payment_status: string
  total_amount: number
  scheduled_delivery_date: string | null
}

export function OrdersTable({ filters, currentPage, onPageChange }: OrdersTableProps) {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const loadOrders = () => {
    setLoading(true)
    setError(null)
    apiGet("/orders")
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrders()
  }, [])

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

  const inRange = (valueISO: string | null, from: string, to: string) => {
    if (!from && !to) return true
    if (!valueISO) return false
    const v = new Date(valueISO)
    const fromDate = from ? new Date(from + "T00:00:00") : null
    const toDate = to ? new Date(to + "T23:59:59") : null
    return (!fromDate || v >= fromDate) && (!toDate || v <= toDate)
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const idMatches = filters.customer.orderId ? o.id.toString().includes(filters.customer.orderId) : true
      const nameMatches = filters.customer.name
        ? (o.client_name ?? "").toLowerCase().includes(filters.customer.name.toLowerCase())
        : true
      const statusMatches = filters.status ? o.status === filters.status : true
      const orderDateMatches = inRange(o.order_date, filters.orderDate.from, filters.orderDate.to)
      const scheduledDateMatches = inRange(
        o.scheduled_delivery_date,
        filters.scheduledDate.from,
        filters.scheduledDate.to,
      )

      return idMatches && nameMatches && statusMatches && orderDateMatches && scheduledDateMatches
    })
  }, [filters, orders])

  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const start = (safePage - 1) * itemsPerPage
  const pageData = filtered.slice(start, start + itemsPerPage)

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages) onPageChange(page)
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Carregando pedidos...</div>
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
                  {o.status === "PENDING" && (
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
        page={safePage}
        pageSize={itemsPerPage}
        totalItems={filtered.length}
        totalPages={totalPages}
        onPageChange={changePage}
      />
    </div>
  )
}
