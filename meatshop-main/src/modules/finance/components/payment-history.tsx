"use client"

import { useState } from "react"
import { apiGet, apiPost } from "@/shared/lib/api"
import { Button } from "@/shared/components/ui/button"
import { formatCurrency } from "@/shared/lib/formatters"
import { usePanelAccess } from "@/shared/providers/panel-access-provider"

type Refund = {
  id: string
  payment_id: string
  amount: number
  status: string
  reason: string
  attempts: number
  last_error: string | null
  created_at: string
  history: { status: string; provider_id: string | null; created_at: string }[]
}
type History = {
  transactions: {
    id: string
    status: string
    amount: number
    refunded_amount: number
    updated_at: string
  }[]
  refunds: Refund[]
  manual: {
    kind: string
    amount: number
    reference: string
    actor_id: number
    created_at: string
  }[]
  settlement: {
    amount: number
    reference: string
    actor_id: number
    paid_at: string
  } | null
}
const states: Record<string, string> = {
  PENDING: "Aguardando processamento",
  COMPLETED: "Concluído",
  FAILED: "Precisa de atendimento",
  RETRY_REQUESTED: "Retomada solicitada",
}

export function PaymentHistory({
  orderId,
  onChange,
}: {
  orderId: number
  onChange: () => void
}) {
  const { hasPermission } = usePanelAccess()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<History | null>(null)
  const [retry, setRetry] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    setBusy(true)
    setError("")
    try {
      setHistory(await apiGet(`/payments/orders/${orderId}/history`))
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar o histórico.",
      )
    } finally {
      setBusy(false)
    }
  }
  const resume = async (id: string) => {
    setBusy(true)
    setError("")
    try {
      await apiPost(`/payments/orders/${orderId}/refunds/${id}/retry`, {})
      setRetry(null)
      await load()
      onChange()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível retomar o estorno.",
      )
    } finally {
      setBusy(false)
    }
  }
  if (!hasPermission("VIEW_FINANCE")) return null
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          setOpen(!open)
          if (!open) void load()
        }}
      >
        {open ? "Fechar histórico" : "Ver histórico financeiro"}
      </Button>
      {open && (
        <div className="rounded border p-3 space-y-3">
          <p className="font-semibold">Histórico do pagamento</p>
          {history?.transactions.map((t) => (
            <p key={t.id}>
              Transação {t.id}: {t.status} · {formatCurrency(Number(t.amount))}{" "}
              · Devolvido: {formatCurrency(Number(t.refunded_amount))}
            </p>
          ))}
          {history?.refunds.map((r) => (
            <div key={r.id} className="border-t pt-2 space-y-1">
              <p>
                Estorno de {formatCurrency(Number(r.amount))}:{" "}
                {states[r.status] ?? r.status}
              </p>
              <p>
                {r.reason} · {r.attempts} tentativa(s)
              </p>
              {r.last_error && (
                <p>
                  O provedor não concluiu a devolução. Confira a conta Mercado
                  Pago antes de retomar.
                </p>
              )}
              {r.history.map((a, i) => (
                <p key={i} className="text-sm text-slate-600">
                  {new Date(a.created_at).toLocaleString("pt-BR")}:{" "}
                  {states[a.status] ?? a.status}
                  {a.provider_id ? ` · Referência ${a.provider_id}` : ""}
                </p>
              ))}
              {r.status === "FAILED" &&
                hasPermission("MANAGE_FINANCE") &&
                (retry === r.id ? (
                  <div className="space-y-2">
                    <p>
                      A situação anterior será consultada no Mercado Pago. Uma
                      nova tentativa só será criada após confirmar a rejeição
                      anterior.
                    </p>
                    <Button disabled={busy} onClick={() => void resume(r.id)}>
                      Confirmar retomada
                    </Button>
                    <Button variant="ghost" onClick={() => setRetry(null)}>
                      Voltar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setRetry(r.id)}
                  >
                    Retomar estorno
                  </Button>
                ))}
            </div>
          ))}
          {history?.manual.map((e, i) => (
            <p key={i}>
              {e.kind === "RECEIPT" ? "Recebimento" : "Devolução presencial"}:{" "}
              {formatCurrency(Number(e.amount))} · {e.reference} · Usuário #
              {e.actor_id} · {new Date(e.created_at).toLocaleString("pt-BR")}
            </p>
          ))}
          {history?.settlement && (
            <p>
              Repasse ao entregador:{" "}
              {formatCurrency(Number(history.settlement.amount))} ·{" "}
              {history.settlement.reference} ·{" "}
              {new Date(history.settlement.paid_at).toLocaleString("pt-BR")}
            </p>
          )}
          {history &&
            !history.transactions.length &&
            !history.refunds.length &&
            !history.manual.length &&
            !history.settlement && (
              <p>Ainda não há movimentações registradas.</p>
            )}
          <Button variant="outline" disabled={busy} onClick={() => void load()}>
            Atualizar histórico
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
