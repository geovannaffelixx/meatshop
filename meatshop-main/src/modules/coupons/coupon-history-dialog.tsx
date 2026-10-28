"use client";
import { History } from "lucide-react";
import { DetailsDialog } from "@/shared/components/details-dialog";
import { formatCurrency } from "@/shared/lib/formatters";
import type { Coupon, Redemption } from "./types";

export function CouponHistoryDialog({
  data,
  onClose,
}: {
  data: { coupon: Coupon; items: Redemption[] } | null;
  onClose: () => void;
}) {
  return (
    <DetailsDialog open={Boolean(data)} onOpenChange={open => { if (!open) onClose(); }} title={`Utilizações de ${data?.coupon.code ?? ""}`} description="Até 500 registros mais recentes de utilização deste cupom." icon={History} className="max-w-4xl">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="data-table">
            <caption className="sr-only">Histórico de utilizações do cupom</caption>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Cliente</th>
                <th scope="col">Unidade</th>
                <th scope="col">Pedido</th>
                <th scope="col">Desconto</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {!data?.items.length ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Ainda não utilizado.
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.redeemed_at).toLocaleString("pt-BR")}</td>
                    <td>{item.user?.name ?? "Não identificado"}</td>
                    <td>{item.unit?.name ?? "Não identificada"}</td>
                    <td>#{item.order_id}</td>
                    <td>{formatCurrency(Number(item.discount_amount))}</td>
                    <td>{item.status === "REDEEMED" ? "Utilizado" : "Liberado"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </DetailsDialog>
  );
}

