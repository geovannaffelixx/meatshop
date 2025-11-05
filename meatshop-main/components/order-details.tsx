"use client"

import React, { useEffect, useState } from "react"

type Product = {
  id: number
  descricao: string
  un: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  obs?: string
}

type OrderData = {
  id: number
  cliente: string
  cpf: string
  contato: string
  agenda: string
  pagamento: string
  valor: number
  produtos: Product[]
  endereco: string
  cep: string
  complemento: string
  observacoesEntrega: string
  dataPedido: string
  subtotal: number
  frete: number
  total: number
  entregaStatus: string
}

interface OrderDetailsProps {
  orderId: string
}

export default function OrderDetails({ orderId }: OrderDetailsProps) {
  const [order, setOrder] = useState<OrderData | null>(null)

  useEffect(() => {
    // 🔹 Simulação de fetch (mock)
    const mockOrder: OrderData = {
      id: Number(orderId),
      cliente: "Amanda Teresa Félix",
      cpf: "714.335.491-07",
      contato: "(62) 99377-5511",
      agenda: "23/09/2025",
      pagamento: "CARTÃO DE CRÉDITO",
      valor: 160.85,
      produtos: [
        {
          id: 16,
          descricao: "COSTELA BOVINA MINERVA",
          un: "KG",
          quantidade: 1.2,
          valorUnitario: 69.9,
          valorTotal: 83.88,
          obs: "CORTAR AS COSTELAS COM CERCA DE DOIS DEDOS DE LARGURA",
        },
        {
          id: 54,
          descricao: "PÃO DE ALHO SANTA MASSA PICANTE",
          un: "PCT",
          quantidade: 2,
          valorUnitario: 19.99,
          valorTotal: 39.98,
          obs: "CORTAR AS COSTELAS COM CERCA DE DOIS DEDOS DE LARGURA",
        },
        {
          id: 35,
          descricao: "LINGUIÇA DE FRANGO SUPERFRANGO COM PEQUI",
          un: "PCT",
          quantidade: 1,
          valorUnitario: 29.49,
          valorTotal: 29.49,
          obs: "CORTAR AS COSTELAS COM CERCA DE DOIS DEDOS DE LARGURA",
        },
      ],
      endereco: "RUA DAS PAINEIRAS - ANÁPOLIS, GO",
      cep: "75106-882",
      complemento: "QUADRA 03, LOTE 26",
      observacoesEntrega: "PAGAMENTO NO ATO DA ENTREGA",
      dataPedido: "19/09/2025 18:25:36",
      subtotal: 153.35,
      frete: 7.5,
      total: 160.85,
      entregaStatus: "PENDENTE",
    }

    setTimeout(() => setOrder(mockOrder), 500)
  }, [orderId])

  if (!order)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Carregando pedido...</p>
      </div>
    )

  return (
    <div className="flex flex-col items-center bg-gray-100 min-h-screen p-6 font-sans">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-5xl">
        <h1 className="text-center text-2xl font-bold text-red-700 mb-1">
          Pedido #{order.id}
        </h1>
        <p className="text-center text-gray-600 font-medium mb-6 flex items-center justify-center gap-2">
          <span>🕓</span> EM ANDAMENTO
        </p>

        {/* Dados do Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-6">
          <div className="sm:col-span-1">
            <label className="text-xs text-gray-500">Cliente</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {order.id}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500">&nbsp;</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {order.cliente}
            </div>
          </div>
          <div className="sm:col-span-1">
            <label className="text-xs text-gray-500">CPF</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {order.cpf}
            </div>
          </div>
          <div className="sm:col-span-1">
            <label className="text-xs text-gray-500">Contato</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {order.contato}
            </div>
          </div>
          <div className="sm:col-span-1">
            <label className="text-xs text-gray-500">Agenda</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {order.agenda}
            </div>
          </div>
        </div>

        {/* Pagamento */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-6">
          <div className="sm:col-span-3">
            <label className="text-xs text-gray-500">Pagamento</label>
            <div className="border rounded-md px-3 py-2 bg-gray-50 font-semibold">
              {order.pagamento}
            </div>
          </div>
          <div className="sm:col-span-3">
            <label className="text-xs text-gray-500">Valor</label>
            <div className="border rounded-md px-3 py-2 bg-red-50 border-red-300 text-red-700 font-bold text-right">
              R$ {order.valor.toFixed(2)}
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
                <th className="p-2 text-center">UN</th>
                <th className="p-2 text-center">QTD</th>
                <th className="p-2 text-center">V. UNITÁRIO</th>
                <th className="p-2 text-center">V. TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {order.produtos.map((p) => (
                <React.Fragment key={p.id}>
                  <tr className="border-b border-gray-200">
                    <td className="p-2">{p.id}</td>
                    <td className="p-2">{p.descricao}</td>
                    <td className="p-2 text-center">{p.un}</td>
                    <td className="p-2 text-center">{p.quantidade.toFixed(3)}</td>
                    <td className="p-2 text-center">R$ {p.valorUnitario.toFixed(2)}</td>
                    <td className="p-2 text-center">R$ {p.valorTotal.toFixed(2)}</td>
                  </tr>
                  {p.obs && (
                    <tr className="bg-gray-50 text-gray-600 italic text-xs border-b border-gray-200">
                      <td colSpan={6} className="p-2">
                        OBS.: {p.obs}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              <tr>
                <td colSpan={6} className="p-2 text-right font-semibold">
                  R$ {order.subtotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detalhes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">
              Detalhes da entrega
            </h3>
            <p><strong>ENDEREÇO:</strong> {order.endereco}</p>
            <p><strong>CEP:</strong> {order.cep}</p>
            <p><strong>COMPLEMENTO:</strong> {order.complemento}</p>
            <p><strong>OBSERVAÇÕES:</strong> {order.observacoesEntrega}</p>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">
              Detalhes do pedido
            </h3>
            <p><strong>DATA:</strong> {order.dataPedido}</p>
            <p><strong>PEDIDO:</strong> R$ {order.subtotal.toFixed(2)}</p>
            <p><strong>FRETE:</strong> R$ {order.frete.toFixed(2)}</p>
            <p><strong>TOTAL:</strong> R$ {order.total.toFixed(2)}</p>
            <p><strong>ENTREGA:</strong> {order.entregaStatus}</p>
          </div>
        </div>

        {/* Botão */}
        <div className="mt-8 flex justify-center">
          <button className="bg-red-700 hover:bg-red-800 text-white font-semibold px-8 py-3 rounded-lg shadow">
            Finalizar
          </button>
        </div>
      </div>
    </div>
  )
}
