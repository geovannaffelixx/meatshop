import React from "react"

type PaymentBreakdown = { name: string; value: number }

type Props = {
  revenueTotal: number
  expenseTotal: number
  payments: PaymentBreakdown[]
}

export function FinanceSummary({ revenueTotal, expenseTotal, payments }: Props) {
  const comparisonBase = Math.max(revenueTotal, expenseTotal, 1)
  const revenuePercentage = (revenueTotal / comparisonBase) * 100
  const expensePercentage = (expenseTotal / comparisonBase) * 100
  const paymentTotal = payments.reduce((total, payment) => total + payment.value, 0)

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-lg p-6 shadow-lg">
      <h3 className="mb-4 text-2xl font-bold text-slate-950">Resultados</h3>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Receitas</span>
            <span className="text-sm font-semibold text-gray-700">{formatCurrency(revenueTotal)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div
              className="h-8 rounded-l-md"
              style={{
                width: `${revenuePercentage}%`,
                backgroundColor: "#16a34a",
                transition: "width .4s ease",
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Despesas</span>
            <span className="text-sm font-semibold text-gray-700">{formatCurrency(expenseTotal)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div
              className="h-8 rounded-l-md"
              style={{
                width: `${expensePercentage}%`,
                backgroundColor: "#dc2626",
                transition: "width .4s ease",
              }}
            />
          </div>
        </div>

        <div className="pt-2">
          <div className="text-sm text-gray-600">
            Saldo:{" "}
            <span className={`font-semibold ${revenueTotal - expenseTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(revenueTotal - expenseTotal)}
            </span>
          </div>
        </div>

        <div className="pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Formas de pagamento</h4>
          <div className="grid grid-cols-1 gap-2">
            {payments.map((p) => {
              const percentage = (p.value / Math.max(paymentTotal, 1)) * 100
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-gray-700">{p.name}</div>
                  <div className="flex-1 bg-gray-200 h-3 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: "#ef4444",
                        height: "100%",
                      }}
                    />
                  </div>
                  <div className="w-28 text-right text-sm font-semibold">
                    {p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
