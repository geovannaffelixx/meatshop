"use client"

import React, { useEffect, useState } from "react"
import { apiGet, apiPatch } from "@/shared/lib/api"
import {
  DELIVERY_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/modules/orders/utils/status-labels"
import { canCancel, canReschedule, getNextAction } from "@/modules/orders/utils/status-transitions"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Spinner } from "@/shared/components/ui/spinner"

type OrderItem = {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
}

type Order = {
  id: number
  client_id: number
  client_name: string | null
  unit_id: number
  order_date: string
  status: string
  delivery_status: string | null
  delivery_step: string | null
  total_amount: number
  subtotal: number
  discount_amount: number
  delivery_fee: number
  delivery_type: string
  payment_status: string
  is_scheduled: boolean
  scheduled_delivery_date: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  items: OrderItem[]
  payment: { method: string | null; status: string; payment_date: string | null } | null
}

interface OrderDetailScreenProps {
  orderId: string
}

const formatarMoeda = (valor: number) => `R$ ${Number(valor).toFixed(2)}`

const formatarData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR") : "-"

function toDatetimeLocal(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function OrderDetailScreen({ orderId }: OrderDetailScreenProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")

  const loadOrder = () => {
    apiGet(`/orders/${orderId}`)
      .then((data) => {
        setOrder(data)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const runAction = async (action: () => Promise<unknown>) => {
    setWorking(true)
    setActionError(null)
    try {
      await action()
      loadOrder()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao atualizar o pedido.")
    } finally {
      setWorking(false)
    }
  }

  const handleAdvance = () => {
    if (!order) return
    const next = getNextAction(order.status, order.delivery_type)
    if (!next) return

    runAction(() =>
      next.endpoint === "confirm"
        ? apiPatch(`/orders/${order.id}/confirm`, {})
        : apiPatch(`/orders/${order.id}/status`, { status: next.targetStatus }),
    )
  }

  const handleCancel = () => {
    if (!order || !cancelReason.trim()) return
    runAction(() => apiPatch(`/orders/${order.id}/cancel`, { reason: cancelReason })).then(() => {
      setCancelOpen(false)
      setCancelReason("")
    })
  }

  const handleReschedule = () => {
    if (!order || !scheduleDate) return
    const iso = new Date(scheduleDate).toISOString()
    runAction(() => apiPatch(`/orders/${order.id}/schedule`, { scheduled_delivery_date: iso })).then(() => {
      setScheduleOpen(false)
    })
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600 font-semibold">Erro ao carregar pedido: {error}</p>
      </div>
    )
  }

  if (!order)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Carregando pedido...</p>
      </div>
    )

  const nextAction = getNextAction(order.status, order.delivery_type)

  return (
    <div className="flex flex-col items-center bg-gray-100 min-h-screen p-6 font-sans">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-5xl">
        <h1 className="text-center text-2xl font-bold text-red-700 mb-1">
          Pedido #{order.id}
        </h1>
        <p className="text-center text-gray-600 font-medium mb-6">
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </p>

        {/* Dados do Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500">Cliente</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {order.client_name ?? `Cliente #${order.client_id}`}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Data do pedido</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {formatarData(order.order_date)}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Entrega</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {DELIVERY_TYPE_LABELS[order.delivery_type] ?? order.delivery_type}
              {order.is_scheduled && order.scheduled_delivery_date
                ? ` — agendado para ${formatarData(order.scheduled_delivery_date)}`
                : ""}
            </div>
          </div>
        </div>

        {/* Pagamento */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-6">
          <div className="sm:col-span-3">
            <label className="text-xs text-gray-500">Pagamento</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {order.payment?.method ?? "-"} (
              {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status})
            </div>
          </div>
          <div className="sm:col-span-3">
            <label className="text-xs text-gray-500">Valor</label>
            <div className="border rounded-md px-3 py-2 bg-red-50 border-red-300 text-red-700 font-bold text-right">
              {formatarMoeda(order.total_amount)}
            </div>
          </div>
        </div>

        {/* Produtos */}
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 rounded-lg text-sm">
            <thead className="bg-gray-200 text-gray-700 font-semibold">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">DESCRIÇÃO DO PRODUTO</th>
                <th className="p-2 text-center">QTD</th>
                <th className="p-2 text-center">V. UNITÁRIO</th>
                <th className="p-2 text-center">V. TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="p-2">{item.product_id}</td>
                  <td className="p-2">{item.product_name}</td>
                  <td className="p-2 text-center">{item.quantity}</td>
                  <td className="p-2 text-center">{formatarMoeda(item.unit_price)}</td>
                  <td className="p-2 text-center">
                    {formatarMoeda(item.quantity * item.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detalhes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">
              Status
            </h3>
            <p><strong>PEDIDO:</strong> {ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
            {order.delivery_status && (
              <p><strong>ENTREGA:</strong> {order.delivery_status}</p>
            )}
            {order.status === "CANCELLED" && (
              <>
                <p><strong>CANCELADO EM:</strong> {formatarData(order.cancelled_at)}</p>
                <p><strong>MOTIVO:</strong> {order.cancellation_reason ?? "-"}</p>
              </>
            )}
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">
              Detalhes do pedido
            </h3>
            <p><strong>SUBTOTAL:</strong> {formatarMoeda(order.subtotal)}</p>
            <p><strong>DESCONTO:</strong> {formatarMoeda(order.discount_amount)}</p>
            <p><strong>TAXA DE ENTREGA:</strong> {formatarMoeda(order.delivery_fee)}</p>
            <p><strong>TOTAL:</strong> {formatarMoeda(order.total_amount)}</p>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-8 border-t pt-6">
          {actionError && (
            <p className="text-sm text-red-600 text-center mb-4">{actionError}</p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {nextAction && (
              <Button
                disabled={working}
                onClick={handleAdvance}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {working && <Spinner />}
                {working ? "Salvando..." : nextAction.label}
              </Button>
            )}

            {canReschedule(order.status) && (
              <Button
                disabled={working}
                variant="outline"
                onClick={() => {
                  setScheduleDate(toDatetimeLocal(order.scheduled_delivery_date))
                  setScheduleOpen(true)
                }}
              >
                {order.is_scheduled ? "Alterar agendamento" : "Agendar entrega"}
              </Button>
            )}

            {canCancel(order.status) && (
              <Button
                disabled={working}
                variant="ghost"
                onClick={() => setCancelOpen(true)}
                className="text-red-700 hover:text-red-800 hover:bg-red-50"
              >
                Cancelar pedido
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar pedido #{order.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Motivo do cancelamento</label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={255}
              placeholder="Ex.: Cliente desistiu da compra"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setCancelOpen(false)}>
                Voltar
              </Button>
              <Button
                disabled={working || !cancelReason.trim()}
                onClick={handleCancel}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {working && <Spinner />}
                {working ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar entrega do pedido #{order.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Data e horário</label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
                Voltar
              </Button>
              <Button
                disabled={working || !scheduleDate}
                onClick={handleReschedule}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {working && <Spinner />}
                {working ? "Salvando..." : "Confirmar agendamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
