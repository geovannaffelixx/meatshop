"use client"

import { Store, ShieldCheck } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { canCompletePickup } from "../utils/status-labels"

interface Props {
  paymentStatus: string
  code: string
  busy: boolean
  error?: string | null
  onCodeChange: (code: string) => void
  onConfirm: () => void
  onRecordPayment?: () => void
}

export function CounterPickupPanel({ paymentStatus, code, busy, error, onCodeChange, onConfirm, onRecordPayment }: Props) {
  const paid = canCompletePickup(paymentStatus)
  return <section className="my-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="counter-pickup-title">
    <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
      <span className="rounded-xl bg-red-50 p-2.5"><Store className="size-5 shrink-0 text-red-700" /></span>
      <div>
        <h2 id="counter-pickup-title" className="font-bold text-slate-900">Confirmar retirada no balcão</h2>
        <p className="mt-1 text-sm text-slate-600">Libere o pedido para o cliente após conferir o pagamento e validar o código apresentado no aplicativo.</p>
      </div>
    </div>
    <div className="grid gap-4 text-sm md:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-900">1. Confirme o pagamento</h3>
        <p className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{paid ? "Pagamento confirmado" : "Pagamento ainda não registrado"}</p>
        <p className="leading-6 text-slate-600">{paid ? "Tudo certo. Prossiga com o código do cliente." : "Use Registrar recebimento somente após receber em dinheiro ou na maquininha. Se foi online, aguarde a confirmação."}</p>
        {!paid && onRecordPayment && <Button variant="outline" onClick={onRecordPayment} disabled={busy} className="w-full whitespace-normal border-slate-300 text-slate-800 sm:w-auto">Registrar pagamento no balcão</Button>}
      </div>
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900">2. Confira o código do cliente</h3>
        <p className="leading-6 text-slate-600">Peça para abrir Meus pedidos → Ver retirada e código.</p>
    <div className="max-w-sm space-y-2">
      <label htmlFor="counter-pickup-code" className="text-sm font-semibold text-slate-800">Código de retirada do cliente</label>
      <Input id="counter-pickup-code" aria-label="Código de retirada do cliente" value={code} inputMode="numeric" autoComplete="off" maxLength={6} placeholder="Ex.: 123456" disabled={busy} className="h-12 text-center text-xl font-semibold tracking-[0.25em]"
        onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ""))} />
      <p className="text-xs text-slate-500">Seis dígitos. O código é validado pelo sistema e só pode ser utilizado uma vez.</p>
    </div>
    </div>
    </div>
    {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    <Button disabled={busy || !paid || !/^\d{6}$/.test(code)} onClick={onConfirm} className="w-full whitespace-normal sm:w-auto">
      <ShieldCheck className="size-4" />{busy ? "Validando retirada..." : "Validar código e confirmar retirada"}
    </Button>
    {!paid && <p role="status" className="text-sm font-medium text-amber-800">O botão será liberado após registrar ou confirmar o pagamento.</p>}
  </section>
}
