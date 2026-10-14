"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { apiGet, apiPost } from "@/shared/lib/api"

import { usePanelAccess } from "@/shared/providers/panel-access-provider"

import { Button } from "@/shared/components/ui/button"

import { Input } from "@/shared/components/ui/input"

import { PAYMENT_STATUS_LABELS } from "@/modules/orders/utils/status-labels"

import { formatCurrency } from "@/shared/lib/formatters"
import { PaymentHistory } from "./payment-history"
import {
  CreditCard,
  Wallet,
  RefreshCw,
  Link2,
  Pause,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock3,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components/ui/card"
import { EmptyState } from "@/shared/components/empty-state"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/lib/utils"

const METHOD_LABELS: Record<string, string> = {
  Cash: "Dinheiro",
  "Card on Delivery": "Maquininha",
  Pix: "Pix",
  Credit: "Cartão de crédito",
  Debit: "Cartão de débito",
}
const ACCOUNT_STATES: Record<
  string,
  { label: string; description: string; tone: string }
> = {
  CONNECTED: {
    label: "Conta conectada",
    description:
      "Os pagamentos online desta unidade são direcionados para a conta autorizada.",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  NOT_CONNECTED: {
    label: "Conexão pendente",
    description:
      "Conecte a conta Mercado Pago do açougue para receber pagamentos online.",
    tone: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  PAUSED: {
    label: "Novas cobranças pausadas",
    description:
      "Pagamentos anteriores e estornos continuam acompanhados. Reconecte a mesma conta para voltar a receber.",
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  RECONNECT_REQUIRED: {
    label: "Reconexão necessária",
    description:
      "Verifique a autorização e reconecte a mesma conta Mercado Pago.",
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  RENEWAL_PENDING: {
    label: "Renovação pendente",
    description:
      "A autorização será renovada no próximo uso. Se houver falha, reconecte a mesma conta.",
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
  },
}
const dateLabel = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })

type PaymentRow = {
  id: number
  status: string
  payment_status: string
  total_amount: number
  method: string | null
  refunded_amount: number
  fee_amount: number
  refund_status: string | null
  delivery_fee?: number
  delivery_person_id?: number | null
  delivery_paid_at?: string | null
  payment_date?: string | null
  transaction_id?: string | null
  receipt_reference?: string | null
}

export function PaymentActions({
  order,
  onChange,
}: {
  order: PaymentRow
  onChange: () => void
}) {
  const { hasPermission } = usePanelAccess()

  const [action, setAction] = useState<
    "receipt" | "refund" | "offline-refund" | "delivery-settlement" | null
  >(null)

  const [reference, setReference] = useState("")

  const [busy, setBusy] = useState(false)

  const [error, setError] = useState("")

  const offline = ["Cash", "Card on Delivery"].includes(order.method ?? "")

  const run = async (endpoint: string, body: object = {}) => {
    setBusy(true)
    setError("")

    try {
      await apiPost(`/payments/orders/${order.id}/${endpoint}`, body)
      setAction(null)
      setReference("")
      onChange()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir a operação.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-w-0 space-y-4 text-sm text-slate-600">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
            ["PAID"].includes(order.payment_status)
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : ["CHARGED_BACK", "REJECTED"].includes(order.payment_status)
                ? "bg-red-50 text-red-700 ring-red-200"
                : "bg-slate-100 text-slate-700 ring-slate-200",
          )}
        >
          {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
        </span>
        <span>
          {METHOD_LABELS[order.method ?? ""] ?? "Método não informado"}
        </span>
      </div>

      {Number(order.refunded_amount) > 0 && (
        <p>Devolvido: {formatCurrency(Number(order.refunded_amount))}</p>
      )}

      {order.refund_status && (
        <p>
          Estorno:{" "}
          {(
            {
              PENDING: "solicitado, aguardando processamento",
              COMPLETED: "concluído",
              FAILED: "falhou; verifique no Mercado Pago",
            } as Record<string, string>
          )[order.refund_status] ?? order.refund_status}
        </p>
      )}
      {order.payment_date && <p>Recebido em {dateLabel(order.payment_date)}</p>}
      {order.transaction_id && (
        <p className="break-all text-xs">Transação: {order.transaction_id}</p>
      )}
      {order.receipt_reference && (
        <p>Referência do recebimento: {order.receipt_reference}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap [&>button]:whitespace-normal [&>button]:text-left">
        {!offline && hasPermission("VIEW_FINANCE") && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run("reconcile")}
          >
            Atualizar no Mercado Pago
          </Button>
        )}

        {hasPermission("MANAGE_FINANCE") &&
          offline &&
          order.payment_status === "PENDING" &&
          order.status !== "CANCELLED" && (
            <Button disabled={busy} onClick={() => setAction("receipt")}>
              Registrar recebimento
            </Button>
          )}

        {hasPermission("MANAGE_FINANCE") &&
          !offline &&
          ["PAID", "PARTIALLY_REFUNDED"].includes(order.payment_status) &&
          ["CANCELLED", "DELIVERED"].includes(order.status) &&
          Number(order.total_amount) > Number(order.refunded_amount) &&
          !order.refund_status && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setAction("refund")}
            >
              Solicitar estorno
            </Button>
          )}

        {hasPermission("MANAGE_FINANCE") &&
          offline &&
          order.payment_status === "PAID" &&
          Number(order.total_amount) > 0 &&
          ["CANCELLED", "DELIVERED"].includes(order.status) && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setAction("offline-refund")}
            >
              Registrar devolução presencial
            </Button>
          )}

        {hasPermission("MANAGE_FINANCE") &&
          order.status === "DELIVERED" &&
          order.delivery_person_id &&
          !order.delivery_paid_at &&
          Number(order.delivery_fee) > 0 && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setAction("delivery-settlement")}
            >
              Registrar pagamento ao entregador
            </Button>
          )}

        {order.delivery_paid_at && (
          <p>
            Pagamento ao entregador registrado em{" "}
            {dateLabel(order.delivery_paid_at)}
          </p>
        )}
      </div>

      {action && (
        <form
          className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault()
            void run(
              action,
              action === "refund"
                ? { reason: reference }
                : {
                    amount: Number(
                      action === "delivery-settlement"
                        ? order.delivery_fee
                        : order.total_amount,
                    ),
                    reference,
                  },
            )
          }}
        >
          <p>
            {action === "delivery-settlement"
              ? `Confirme após transferir ${formatCurrency(Number(order.delivery_fee))} ao entregador. Esta ação registra a transferência; não movimenta dinheiro.`
              : action === "offline-refund"
                ? `Confirme após devolver ${formatCurrency(Number(order.total_amount))} ao cliente.`
                : action === "receipt"
                  ? `Confirme somente após receber ${formatCurrency(Number(order.total_amount))}.`
                  : `Solicitar a devolução do saldo deste pedido: ${formatCurrency(Number(order.total_amount) - Number(order.refunded_amount))}.`}
          </p>

          <label className="block space-y-2 font-medium text-slate-800">
            {action === "refund"
              ? "Motivo do estorno"
              : "Referência / comprovante"}
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
              minLength={action === "refund" ? 5 : 3}
              maxLength={200}
            />
          </label>

          <Button type="submit" disabled={busy}>
            Confirmar {action === "refund" ? "solicitação" : "registro"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setAction(null)}
          >
            Voltar
          </Button>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <PaymentHistory orderId={order.id} onChange={onChange} />
    </div>
  )
}

export function PaymentManagement({
  unitId,
  month,
  onFinancialChange,
}: {
  unitId: number
  month?: string
  onFinancialChange?: () => void
}) {
  const { hasPermission } = usePanelAccess()

  const [account, setAccount] = useState<{
    available: boolean
    connected: boolean
    collector_id: string | null
    state?: string
    expires_at?: string | null
    history?: { kind: string; collector_id: string; created_at: string }[]
  } | null>(null)

  const [rows, setRows] = useState<PaymentRow[]>([])

  const [error, setError] = useState("")

  const [page, setPage] = useState(0)
  const [view, setView] = useState("all")

  const [busy, setBusy] = useState(false)

  const [loading, setLoading] = useState(true)
  const request = useRef({ sequence: 0 })
  const load = useCallback(
    async (foreground = true) => {
      const current = ++request.current.sequence
      if (foreground) {
        setLoading(true)
        setRows([])
      }
      try {
        const [payments, seller] = await Promise.all([
          apiGet(
            `/payments/orders?unit_id=${unitId}&page=${page}&view=${view}${month ? `&month=${month}` : ""}`,
          ),
          hasPermission("MANAGE_FINANCE")
            ? apiGet(`/payments/sellers/${unitId}/status`)
            : Promise.resolve(null),
        ])
        if (current !== request.current.sequence) return
        setRows(payments)
        setAccount(seller)
        setError("")
      } catch (e) {
        if (current !== request.current.sequence) return
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar pagamentos.",
        )
      } finally {
        if (current === request.current.sequence) setLoading(false)
      }
    },
    [unitId, page, hasPermission, view, month],
  )

  useEffect(() => {
    const pendingRequests = request.current
    void load()
    const timer = setInterval(() => void load(false), 30_000)
    return () => {
      clearInterval(timer)
      pendingRequests.sequence++
    }
  }, [load])

  const pause = async () => {
    setBusy(true)
    try {
      await apiPost(`/payments/sellers/${unitId}/pause`, {})
      await load(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível pausar.")
    } finally {
      setBusy(false)
    }
  }

  const connect = async () => {
    setBusy(true)

    try {
      const { url } = await apiPost(`/payments/sellers/${unitId}/connect`, {})

      const destination = new URL(url)

      if (destination.origin !== "https://auth.mercadopago.com.br")
        throw new Error("Endereço de autorização inválido")

      window.location.assign(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na conexão")
      setBusy(false)
    }
  }

  const state =
    ACCOUNT_STATES[
      account?.state ?? (account?.connected ? "CONNECTED" : "NOT_CONNECTED")
    ] ?? ACCOUNT_STATES.NOT_CONNECTED
  const period = month
    ? new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <section
      className="min-w-0 space-y-6"
      aria-label="Recebimentos e integração Mercado Pago"
    >
      {hasPermission("MANAGE_FINANCE") && (
        <Card className="gap-4 border-slate-200 bg-white shadow-sm">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700">
                  <CreditCard className="size-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <CardTitle className="text-base text-slate-900">
                    Mercado Pago
                  </CardTitle>
                  <CardDescription>
                    Conta de recebimento desta unidade
                  </CardDescription>
                </div>
              </div>
              {account && (
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                    state.tone,
                  )}
                >
                  {account.state === "CONNECTED" ? (
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Clock3 className="size-3.5" aria-hidden="true" />
                  )}
                  {state.label}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            {!account && loading ? (
              <Skeleton className="h-20 w-full" />
            ) : account ? (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-2 text-sm text-slate-600">
                    <p className="max-w-2xl leading-relaxed">
                      {state.description}
                    </p>
                    {account.collector_id && (
                      <p className="break-all text-xs text-slate-500">
                        Identificador da conta: {account.collector_id}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                    <Button
                      className="whitespace-normal"
                      onClick={connect}
                      disabled={!account.available || busy}
                    >
                      <Link2 className="size-4" aria-hidden="true" />
                      {account.connected
                        ? "Reconectar conta"
                        : "Conectar Mercado Pago"}
                    </Button>
                    {account.connected && account.state !== "PAUSED" && (
                      <Button
                        className="whitespace-normal"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void pause()}
                      >
                        <Pause className="size-4" aria-hidden="true" />
                        Pausar novas cobranças
                      </Button>
                    )}
                  </div>
                </div>
                {!account.available && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Pagamentos online estão indisponíveis. O administrador
                    precisa conferir a configuração e a habilitação da
                    integração.
                  </p>
                )}
                {!!account.history?.length && (
                  <details className="rounded-lg border border-slate-200 p-3 text-sm">
                    <summary className="cursor-pointer font-medium text-slate-700">
                      Atividade da conexão
                    </summary>
                    <ul className="mt-3 space-y-2 text-xs text-slate-500">
                      {account.history.slice(0, 3).map((event, i) => (
                        <li key={i} className="break-words">
                          {(
                            {
                              CONNECTED: "Conta conectada",
                              RECONNECTED: "Conta reconectada",
                              PAUSED: "Novas cobranças pausadas",
                            } as Record<string, string>
                          )[event.kind] ?? event.kind}{" "}
                          · {dateLabel(event.created_at)}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Não foi possível consultar a conexão. Atualize para tentar
                novamente.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-4 border-b border-slate-200 px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg text-slate-900">
                Recebimentos dos pedidos
              </CardTitle>
              <CardDescription>
                Acompanhe pagamentos, devoluções e repasses por pedido.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw
                className={cn("size-4", loading && "animate-spin")}
                aria-hidden="true"
              />
              Atualizar
            </Button>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="block w-full space-y-1.5 text-sm font-medium text-slate-700 md:max-w-sm">
              Situação financeira
              <select
                className="input w-full"
                value={view}
                onChange={(e) => {
                  setPage(0)
                  setView(e.target.value)
                }}
              >
                <option value="all">Todos os pagamentos</option>
                <option value="pending">Pagamentos pendentes</option>
                <option value="receivable">A receber presencialmente</option>
                <option value="refunds">Estornos pendentes ou com falha</option>
                <option value="issues">Contestações e falhas</option>
              </select>
            </label>
            {period && (
              <p className="max-w-md text-xs leading-relaxed text-slate-500">
                Pedidos criados em{" "}
                <span className="font-medium text-slate-700">{period}</span>. O
                resumo do mês considera a data do recebimento.
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pt-5 sm:px-6" aria-busy={loading}>
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>{error}</p>
            </div>
          )}
          {loading ? (
            <div
              className="space-y-4"
              role="status"
              aria-label="Carregando pagamentos"
            >
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : rows.length ? (
            <div className="space-y-4">
              {rows.map((row) => (
                <article
                  key={row.id}
                  className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <a
                      className="w-fit font-semibold text-slate-900 underline-offset-4 hover:text-red-700 hover:underline focus-visible:outline-red-600"
                      href={`/orders/${row.id}`}
                    >
                      Pedido #{row.id}
                    </a>
                    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">
                          Valor do pedido
                        </dt>
                        <dd className="font-semibold tabular-nums text-slate-900">
                          {formatCurrency(Number(row.total_amount))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Taxas</dt>
                        <dd className="tabular-nums text-slate-600">
                          {formatCurrency(Number(row.fee_amount))}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <PaymentActions
                    order={row}
                    onChange={() => {
                      void load(false)
                      onFinancialChange?.()
                    }}
                  />
                </article>
              ))}
            </div>
          ) : !error ? (
            <EmptyState
              icon={Wallet}
              title="Nenhum pagamento encontrado"
              description="Os pedidos desta unidade aparecerão aqui. Você também pode conferir outro período ou situação financeira."
            />
          ) : null}
        </CardContent>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 pt-4 sm:px-6">
          <p className="text-xs text-slate-500">
            Página {page + 1}
            {!loading && rows.length > 0
              ? ` · ${rows.length} pedido${rows.length === 1 ? "" : "s"}`
              : ""}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={rows.length < 20 || loading || !!error}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>
      <p className="px-1 text-xs leading-relaxed text-slate-500">
        O resumo considera taxas e devoluções conhecidas. Os valores são
        indicadores financeiros da unidade e não representam saldo disponível
        para saque no Mercado Pago.
      </p>
    </section>
  )
}
