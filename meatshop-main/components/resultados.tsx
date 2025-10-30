import React from "react"

type Pagamento = { name: string; value: number }

type Props = {
  receitasTotal: number 
  despesasTotal: number
  pagamentos: Pagamento[] 
}

export default function Resultados({ receitasTotal, despesasTotal, pagamentos }: Props) {
  const maior = Math.max(receitasTotal, despesasTotal, 1) // evitar /0
  const receitaPct = (receitasTotal / maior) * 100
  const despesaPct = (despesasTotal / maior) * 100

  // formatador R$
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-lg p-6 shadow-lg">
      <h3 className="text-2xl font-bold text-red-600 mb-4">Resultados</h3>

      <div className="space-y-4">
        {/* Receitas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Receitas</span>
            <span className="text-sm font-semibold text-gray-700">{fmt(receitasTotal)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div
              className="h-8 rounded-l-md"
              style={{
                width: `${receitaPct}%`,
                backgroundColor: "#16a34a",
                transition: "width .4s ease",
              }}
            />
          </div>
        </div>

        {/* Despesas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Despesas</span>
            <span className="text-sm font-semibold text-gray-700">{fmt(despesasTotal)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div
              className="h-8 rounded-l-md"
              style={{
                width: `${despesaPct}%`,
                backgroundColor: "#dc2626",
                transition: "width .4s ease",
              }}
            />
          </div>
        </div>

        {/* Saldo */}
        <div className="pt-2">
          <div className="text-sm text-gray-600">
            Saldo:{" "}
            <span className={`font-semibold ${receitasTotal - despesasTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmt(receitasTotal - despesasTotal)}
            </span>
          </div>
        </div>

        {/* Breakdown simples por forma de pagamento */}
        <div className="pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Formas de pagamento</h4>
          <div className="grid grid-cols-1 gap-2">
            {pagamentos.map((p) => {
              const pct = (p.value / Math.max(despesasTotal, 1)) * 100
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-gray-700">{p.name}</div>
                  <div className="flex-1 bg-gray-200 h-3 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(pct, 100)}%`,
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