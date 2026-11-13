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
}

export function CounterPickupPanel({ paymentStatus, code, busy, error, onCodeChange, onConfirm }: Props) {
  const paid = canCompletePickup(paymentStatus)
  return <section className="my-6 space-y-4 rounded-2xl border border-red-100 bg-red-50/50 p-5" aria-labelledby="counter-pickup-title">
    <div className="flex items-start gap-3">
      <Store className="mt-0.5 size-5 shrink-0 text-red-700" />
      <div>
        <h2 id="counter-pickup-title" className="font-bold text-slate-900">Confirmar retirada no balcão</h2>
        <p className="mt-1 text-sm text-slate-600">Libere o pedido para o cliente após conferir o pagamento e validar o código apresentado no aplicativo.</p>
      </div>
    </div>
    <ol className="space-y-2 text-sm text-slate-700">
      <li><strong>1. Pagamento:</strong> {paid ? "confirmado. Prossiga com o código." : "pendente. Receba no balcão e use Registrar recebimento na seção de pagamento. Se foi online, aguarde a confirmação."}</li>
      <li><strong>2. Código:</strong> peça ao cliente para abrir Meus pedidos → Ver retirada e código.</li>
    </ol>
    <div className="max-w-sm space-y-2">
      <label htmlFor="counter-pickup-code" className="text-sm font-semibold text-slate-800">Código de retirada do cliente</label>
      <Input id="counter-pickup-code" aria-label="Código de retirada do cliente" value={code} inputMode="numeric" autoComplete="off" maxLength={6} placeholder="Ex.: 123456" disabled={busy}
        onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ""))} />
      <p className="text-xs text-slate-500">Seis dígitos. O código é validado pelo sistema e só pode ser utilizado uma vez.</p>
    </div>
    {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    <Button disabled={busy || !paid || !/^\d{6}$/.test(code)} onClick={onConfirm}>
      <ShieldCheck className="size-4" />{busy ? "Validando retirada..." : "Validar código e confirmar retirada"}
    </Button>
  </section>
}
