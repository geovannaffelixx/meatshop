"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPost } from "@/shared/lib/api";

import { usePanelAccess } from "@/shared/providers/panel-access-provider";

import { Button } from "@/shared/components/ui/button";

import { Input } from "@/shared/components/ui/input";

import { PAYMENT_STATUS_LABELS } from "@/modules/orders/utils/status-labels";

import { formatCurrency } from "@/shared/lib/formatters";

type PaymentRow = {
  id: number;
  status: string;
  payment_status: string;
  total_amount: number;
  method: string | null;
  refunded_amount: number;
  fee_amount: number;
  refund_status: string | null;
  delivery_fee?: number;
  delivery_person_id?: number | null;
  delivery_paid_at?: string | null;
};

export function PaymentActions({
  order,
  onChange,
}: {
  order: PaymentRow;
  onChange: () => void;
}) {
  const { hasPermission } = usePanelAccess();

  const [action, setAction] = useState<
    "receipt" | "refund" | "offline-refund" | "delivery-settlement" | null
  >(null);

  const [reference, setReference] = useState("");

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const offline = ["Cash", "Card on Delivery"].includes(order.method ?? "");

  const run = async (endpoint: string, body: object = {}) => {
    setBusy(true);
    setError("");

    try {
      await apiPost(`/payments/orders/${order.id}/${endpoint}`, body);
      setAction(null);
      setReference("");
      onChange();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <p>
        {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status} ·{" "}
        {order.method ?? "Método não informado"}
      </p>

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

      <div className="flex flex-wrap gap-2">
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
            {new Date(order.delivery_paid_at).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {action && (
        <form
          className="rounded border p-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
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
            );
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

          <label>
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
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function PaymentManagement({ unitId }: { unitId: number }) {
  const { hasPermission } = usePanelAccess();

  const [account, setAccount] = useState<{
    available: boolean;
    connected: boolean;
    collector_id: string | null;
  } | null>(null);

  const [rows, setRows] = useState<PaymentRow[]>([]);

  const [error, setError] = useState("");

  const [page, setPage] = useState(0);

  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const payments = await apiGet(
        `/payments/orders?unit_id=${unitId}&page=${page}`,
      );

      setRows(payments);

      if (hasPermission("MANAGE_FINANCE"))
        setAccount(await apiGet(`/payments/sellers/${unitId}/status`));

      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar pagamentos.",
      );
    }
  }, [unitId, page, hasPermission]);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    setBusy(true);

    try {
      const { url } = await apiPost(`/payments/sellers/${unitId}/connect`, {});

      const destination = new URL(url);

      if (destination.origin !== "https://auth.mercadopago.com.br")
        throw new Error("Endereço de autorização inválido");

      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na conexão");
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border bg-white p-4 space-y-4">
      <h2 className="text-lg font-semibold">Recebimentos e Mercado Pago</h2>

      <p>
        O dinheiro dos pedidos desta unidade é recebido na conta Mercado Pago
        conectada. Os valores líquidos abaixo descontam taxas e devoluções
        conhecidas; não representam saldo disponível para saque.
      </p>

      {account && (
        <div>
          <p>
            {account.connected
              ? `Conta conectada: ${account.collector_id}`
              : "Conta Mercado Pago não conectada."}
          </p>

          <Button onClick={connect} disabled={!account.available || busy}>
            {account.connected ? "Reconectar conta" : "Conectar Mercado Pago"}
          </Button>

          {!account.available && (
            <p>
              A integração precisa ser configurada pelo administrador do
              sistema.
            </p>
          )}
        </div>
      )}

      <Button variant="outline" onClick={load}>
        Atualizar
      </Button>

      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}

      {rows.map((row) => (
        <article key={row.id} className="border-t pt-3">
          <a className="font-semibold underline" href={`/orders/${row.id}`}>
            Pedido #{row.id}
          </a>

          <p>
            Bruto: {formatCurrency(Number(row.total_amount))} · Taxas:{" "}
            {formatCurrency(Number(row.fee_amount))}
          </p>

          <PaymentActions order={row} onChange={load} />
        </article>
      ))}

      {!rows.length && <p>Nenhum pagamento nesta página.</p>}

      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={rows.length < 20}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>
    </section>
  );
}
