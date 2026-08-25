"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { apiGet, apiPatch } from "@/shared/lib/api"
import { ORDER_STATUS_LABELS } from "@/modules/orders/utils/status-labels"
import { Spinner } from "@/shared/components/ui/spinner"

interface Filters {
  dataPedido: { de: string; ate: string }
  dataAgendada: { de: string; ate: string }
  status: string
  cliente: { id: string; nome: string }
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
      loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar pedido.")
    } finally {
      setConfirmingId(null)
    }
  }

  const inRange = (valueISO: string | null, de: string, ate: string) => {
    if (!de && !ate) return true
    if (!valueISO) return false
    const v = new Date(valueISO)
    const from = de ? new Date(de + "T00:00:00") : null
    const to = ate ? new Date(ate + "T23:59:59") : null
    return (!from || v >= from) && (!to || v <= to)
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const idOk = filters.cliente.id ? o.id.toString().includes(filters.cliente.id) : true
      const nomeOk = filters.cliente.nome
        ? (o.client_name ?? "").toLowerCase().includes(filters.cliente.nome.toLowerCase())
        : true
      const statusOk = filters.status ? o.status === filters.status : true
      const dataPedidoOk = inRange(o.order_date, filters.dataPedido.de, filters.dataPedido.ate)
      const dataAgendadaOk = inRange(
        o.scheduled_delivery_date,
        filters.dataAgendada.de,
        filters.dataAgendada.ate,
      )

      return idOk && nomeOk && statusOk && dataPedidoOk && dataAgendadaOk
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
    return <div className="p-4 text-gray-500 italic">Carregando pedidos...</div>
  }
  if (error) {
    return <div className="p-4 text-red-600 font-semibold">Erro: {error}</div>
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-300 p-4">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700 font-semibold">
          <tr>
            <th className="p-2">ID</th>
            <th className="p-2">Nome Cliente</th>
            <th className="p-2">Data do Pedido</th>
            <th className="p-2">Data Agendada</th>
            <th className="p-2">Status do pedido</th>
            <th className="p-2">Valor</th>
            <th className="p-2">Entrega</th>
            <th className="p-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {pageData.length > 0 ? (
            pageData.map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50 transition-colors">
                <td className="p-2">{o.id}</td>
                <td className="p-2">{o.client_name ?? `Cliente #${o.client_id}`}</td>
                <td className="p-2">{o.order_date?.substring(0, 10) ?? "-"}</td>
                <td className="p-2">{o.scheduled_delivery_date?.substring(0, 10) ?? "-"}</td>
                <td className="p-2">{ORDER_STATUS_LABELS[o.status] ?? o.status}</td>
                <td className="p-2">R$ {Number(o.total_amount).toFixed(2)}</td>
                <td className="p-2">{o.delivery_type === "DELIVERY" ? "Entrega" : "Retirada"}</td>
                <td className="p-2 text-center space-x-3">
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
                    className="text-red-600 font-semibold hover:underline"
                  >
                    VER MAIS
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="text-center p-4 text-gray-500 italic">
                Nenhum pedido encontrado com os filtros aplicados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          onClick={() => changePage(safePage - 1)}
          className="px-2 text-gray-600 disabled:opacity-50"
          disabled={safePage === 1}
        >
          {"<"}
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => changePage(i + 1)}
            className={`px-2 ${safePage === i + 1 ? "text-red-700 font-bold" : "text-gray-600"}`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => changePage(safePage + 1)}
          className="px-2 text-gray-600 disabled:opacity-50"
          disabled={safePage === totalPages}
        >
          {">"}
        </button>
      </div>
    </div>
  )
}
