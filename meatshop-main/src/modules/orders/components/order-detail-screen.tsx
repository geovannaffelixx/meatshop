"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, MessageSquare } from "lucide-react"
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
import { formatCurrency, formatDateTime } from "@/shared/lib/formatters"

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
    <div className="page-surface p-4 sm:p-6">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Link href="/orders" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700">
          <ArrowLeft className="size-4" />
          Voltar aos pedidos
        </Link>
        <h1 className="text-2xl font-bold text-slate-950">
          Pedido #{order.id}
        </h1>
        <span className="mt-2 mb-6 inline-flex rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>

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
              {formatDateTime(order.order_date)}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Entrega</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {DELIVERY_TYPE_LABELS[order.delivery_type] ?? order.delivery_type}
              {order.is_scheduled && order.scheduled_delivery_date
                ? ` — agendado para ${formatDateTime(order.scheduled_delivery_date)}`
                : ""}
            </div>
          </div>
        </div>

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
              {formatCurrency(order.total_amount)}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">Itens do pedido</caption>
            <thead className="bg-gray-200 text-gray-700 font-semibold">
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Produto</th>
                <th scope="col" className="text-center">Quantidade</th>
                <th scope="col" className="text-center">Valor unitário</th>
                <th scope="col" className="text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="p-2">{item.product_id}</td>
                  <td className="p-2">{item.product_name}</td>
                  <td className="p-2 text-center">{item.quantity}</td>
                  <td className="p-2 text-center">{formatCurrency(item.unit_price)}</td>
                  <td className="p-2 text-center">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
                <p><strong>Cancelado em:</strong> {formatDateTime(order.cancelled_at)}</p>
                <p><strong>MOTIVO:</strong> {order.cancellation_reason ?? "-"}</p>
              </>
            )}
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">
              Detalhes do pedido
            </h3>
            <p><strong>Subtotal:</strong> {formatCurrency(order.subtotal)}</p>
            <p><strong>Desconto:</strong> {formatCurrency(order.discount_amount)}</p>
            <p><strong>Taxa de entrega:</strong> {formatCurrency(order.delivery_fee)}</p>
            <p><strong>Total:</strong> {formatCurrency(order.total_amount)}</p>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          {actionError && (
            <p className="text-sm text-red-600 text-center mb-4">{actionError}</p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline" className="text-slate-700">
              <Link href={`/chat?order=${order.id}&channel=UNIT`}>
                <MessageSquare className="size-4" />
                Conversar sobre o pedido
              </Link>
            </Button>
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
            <label htmlFor="cancellation-reason" className="text-sm font-medium text-gray-700">Motivo do cancelamento</label>
            <Textarea
              id="cancellation-reason"
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
            <label htmlFor="scheduled-delivery-date" className="text-sm font-medium text-gray-700">Data e horário</label>
            <Input
              id="scheduled-delivery-date"
              type="datetime-local"
              min={toDatetimeLocal(new Date().toISOString())}
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
