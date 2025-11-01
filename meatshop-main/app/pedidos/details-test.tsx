'use client'

import React, { useState } from 'react'

// --- Tipagem dos dados do pedido ---
interface PedidoData {
  numero: string
  status: string
  valorTotal: number
  cliente: string
  cpf: string
  contato: string
  agenda: string
  pagamento: string
  itens: {
    id: number
    descricao: string
    un: 'KG' | 'PCT'
    quantidade: number
    valorUnitario: number
    valorTotal: number
    obs?: string
  }[]
  endereco: string
  cep: string
  complemento: string
  observacoesEntrega: string
  dataPedido: string
  subtotal: number
  frete: number
  entregaStatus: string
}

// --- Props esperadas do componente ---
interface PaginaPedidoProps {
  onClose: () => void
  pedido?: PedidoData
}

// --- Mock inicial (enquanto não vem do backend) ---
const DADOS_INICIAIS_MOCK: PedidoData = {
  numero: '#00000',
  status: 'CARREGANDO',
  valorTotal: 0.0,
  cliente: 'N/A',
  cpf: 'N/A',
  contato: 'N/A',
  agenda: 'N/A',
  pagamento: 'N/A',
  itens: [],
  endereco: 'N/A',
  cep: 'N/A',
  complemento: 'N/A',
  observacoesEntrega: 'N/A',
  dataPedido: 'N/A',
  subtotal: 0.0,
  frete: 0.0,
  entregaStatus: 'N/A',
}

// --- Componente Principal ---
const PaginaPedido: React.FC<PaginaPedidoProps> = ({ onClose, pedido }) => {
  const [pedidoData] = useState<PedidoData>(pedido ?? DADOS_INICIAIS_MOCK)

  const formatarMoeda = (valor: number) =>
    `R$ ${valor.toFixed(2).replace('.', ',')}`

  const DetailItem: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
    label,
    value,
    highlight = false,
  }) => (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-xs uppercase font-medium text-gray-500">{label}:</span>
      <span
        className={`font-semibold text-right ${
          highlight ? 'text-red-600' : 'text-gray-800'
        }`}
      >
        {value}
      </span>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-lg shadow-xl p-6 sm:p-8 font-sans overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md transition"
        >
          ✕
        </button>

        {/* Cabeçalho */}
        <div className="text-center mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-red-600">
            Pedido {pedidoData.numero}
          </h1>
          <p className="text-gray-500 mt-1">{pedidoData.status}</p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Cliente', value: pedidoData.cliente, width: 'col-span-2' },
            { label: 'CPF', value: pedidoData.cpf, width: 'col-span-1' },
            { label: 'Contato', value: pedidoData.contato, width: 'col-span-1' },
            { label: 'Agenda', value: pedidoData.agenda, width: 'col-span-1' },
            { label: 'Pagamento', value: pedidoData.pagamento, width: 'col-span-1' },
            {
              label: 'Valor',
              value: formatarMoeda(pedidoData.valorTotal),
              width: 'col-span-1',
              highlighted: true,
            },
          ].map((item, index) => (
            <div
              key={index}
              className={`${item.width} p-2 border rounded-md text-sm ${
                item.highlighted
                  ? 'bg-red-100 border-red-400 text-red-700 font-bold'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="text-xs text-gray-500 uppercase">{item.label}</div>
              <div className="font-medium text-gray-800">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Tabela de Itens */}
        <div className="overflow-x-auto mb-8 border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-center">UN</th>
                <th className="px-4 py-3 text-right">Qtd</th>
                <th className="px-4 py-3 text-right">Vlr Unitário</th>
                <th className="px-4 py-3 text-right">Vlr Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {pedidoData.itens.length > 0 ? (
                pedidoData.itens.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{item.id}</td>
                      <td className="px-4 py-2">{item.descricao}</td>
                      <td className="px-4 py-2 text-center">{item.un}</td>
                      <td className="px-4 py-2 text-right">
                        {item.quantidade.toFixed(3).replace('.', ',')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatarMoeda(item.valorUnitario)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatarMoeda(item.valorTotal)}
                      </td>
                    </tr>
                    {item.obs && (
                      <tr className="bg-gray-50">
                        <td className="px-4 py-1 text-xs text-gray-500 font-bold">
                          OBS:
                        </td>
                        <td
                          className="px-4 py-1 text-xs italic text-gray-600"
                          colSpan={4}
                        >
                          {item.obs}
                        </td>
                        <td></td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-4 text-gray-500 italic"
                  >
                    Nenhum item encontrado.
                  </td>
                </tr>
              )}
              <tr className="bg-white">
                <td
                  colSpan={5}
                  className="px-4 py-3 text-right font-bold text-gray-700"
                >
                  Subtotal:
                </td>
                <td className="px-4 py-3 text-right font-extrabold text-lg">
                  {formatarMoeda(pedidoData.subtotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detalhes e Entrega */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
              Detalhes da entrega
            </h3>
            <DetailItem label="Cliente" value={pedidoData.cliente} />
            <DetailItem label="Endereço" value={pedidoData.endereco} />
            <DetailItem label="CEP" value={pedidoData.cep} />
            <DetailItem label="Complemento" value={pedidoData.complemento} />
            <DetailItem
              label="Observações"
              value={pedidoData.observacoesEntrega}
              highlight
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">
              Detalhes do pedido
            </h3>
            <DetailItem label="Data" value={pedidoData.dataPedido} />
            <DetailItem label="Subtotal" value={formatarMoeda(pedidoData.subtotal)} />
            <DetailItem label="Frete" value={formatarMoeda(pedidoData.frete)} />
            <div className="flex justify-between mt-2 py-2 border-t border-gray-300">
              <span className="text-base uppercase font-bold text-gray-800">
                Total:
              </span>
              <span className="text-xl font-extrabold text-red-600">
                {formatarMoeda(pedidoData.valorTotal)}
              </span>
            </div>
            <DetailItem label="Entrega" value={pedidoData.entregaStatus} />
          </div>
        </div>

        {/* Botão de Ação */}
        <div className="flex justify-center mt-10">
          <button
            onClick={() =>
              alert('AQUI ENTRA O BACKEND: Finalizar Pedido / Atualizar Status')
            }
            className="bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-12 rounded-lg shadow-lg transition duration-200"
          >
            Finalizar
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaginaPedido
