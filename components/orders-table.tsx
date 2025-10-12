"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"

type Order = {
  id: number
  nomeCliente: string
  dataPedido: string
  dataAgendada: string
  status: string
  valor: string
  formaPagamento: string
}

const orders: Order[] = [
  { id: 1, nomeCliente: "AMANDA TERESA FÉLIX", dataPedido: "20/08/2025", dataAgendada: "23/08/2025", status: "Pendente", valor: "R$ 159,68", formaPagamento: "DINHEIRO" },
  { id: 2, nomeCliente: "FLÁVIO FELIPE COUTO", dataPedido: "20/08/2025", dataAgendada: "21/08/2025", status: "Entregue", valor: "R$ 111,28", formaPagamento: "CRÉDITO" },
  { id: 3, nomeCliente: "RICARDO NOGUEIRA SILVA", dataPedido: "20/08/2025", dataAgendada: "21/08/2025", status: "Entregue", valor: "R$ 630,44", formaPagamento: "CRÉDITO" },
  { id: 4, nomeCliente: "FERNANDA ALVES MOURA", dataPedido: "20/08/2025", dataAgendada: "20/08/2025", status: "Cancelado", valor: "R$ 55,40", formaPagamento: "CRÉDITO" },
  { id: 5, nomeCliente: "LUCAS PEREIRA ANDRADE", dataPedido: "20/08/2025", dataAgendada: "20/08/2025", status: "Pendente", valor: "R$ 81,99", formaPagamento: "DÉBITO" },
  { id: 6, nomeCliente: "CAMILA ROCHA MARTINS", dataPedido: "20/08/2025", dataAgendada: "20/08/2025", status: "Entregue", valor: "R$ 215,18", formaPagamento: "DINHEIRO" },
  { id: 7, nomeCliente: "JOÃO VICTOR BARBOSA LI", dataPedido: "20/08/2025", dataAgendada: "20/08/2025", status: "Entregue", valor: "R$ 281,35", formaPagamento: "CRÉDITO" },
  { id: 8, nomeCliente: "MARIANA COSTA FIGUEIRE", dataPedido: "20/08/2025", dataAgendada: "20/08/2025", status: "Entregue", valor: "R$ 158,97", formaPagamento: "DINHEIRO" },
  { id: 9, nomeCliente: "RAFAEL TORRES ALMEIDA", dataPedido: "20/08/2025", dataAgendada: "20/08/2025", status: "Entregue", valor: "R$ 151,22", formaPagamento: "DINHEIRO" },
  { id: 10, nomeCliente: "ALINE CARVALHO DUARTE", dataPedido: "19/08/2025", dataAgendada: "20/08/2025", status: "Entregue", valor: "R$ 41,33", formaPagamento: "DÉBITO" },
  { id: 11, nomeCliente: "BRUNO HENRIQUE MOREIR", dataPedido: "19/08/2025", dataAgendada: "19/08/2025", status: "Entregue", valor: "R$ 215,18", formaPagamento: "DÉBITO" },
  { id: 12, nomeCliente: "JULIANA MENDES FREITAS", dataPedido: "19/08/2025", dataAgendada: "19/08/2025", status: "Entregue", valor: "R$ 331,45", formaPagamento: "CRÉDITO" },
  { id: 13, nomeCliente: "FELIPE RAMOS CARDOSO", dataPedido: "19/08/2025", dataAgendada: "19/08/2025", status: "Cancelado", valor: "R$ 220,33", formaPagamento: "DÉBITO" },
  { id: 14, nomeCliente: "BEATRIZ OLIVEIRA CASTRO", dataPedido: "18/08/2025", dataAgendada: "19/08/2025", status: "Cancelado", valor: "R$ 481,88", formaPagamento: "DÉBITO" },
  { id: 15, nomeCliente: "ANDRÉ LUIZ FONSECA", dataPedido: "18/08/2025", dataAgendada: "18/08/2025", status: "Entregue", valor: "R$ 117,21", formaPagamento: "DINHEIRO" },
  { id: 16, nomeCliente: "CAROLINA PIRES GONÇALV", dataPedido: "18/08/2025", dataAgendada: "18/08/2025", status: "Entregue", valor: "R$ 301,22", formaPagamento: "DINHEIRO" },
  { id: 17, nomeCliente: "GABRIEL SOUZA TAVARES", dataPedido: "18/08/2025", dataAgendada: "18/08/2025", status: "Entregue", valor: "R$ 184,82", formaPagamento: "CRÉDITO" },
  { id: 18, nomeCliente: "LARISSA MONTEIRO CAMP", dataPedido: "18/08/2025", dataAgendada: "18/08/2025", status: "Entregue", valor: "R$ 253,66", formaPagamento: "DINHEIRO" },
  { id: 19, nomeCliente: "THIAGO FERREIRA GOMES", dataPedido: "17/08/2025", dataAgendada: "17/08/2025", status: "Cancelado", valor: "R$ 98,55", formaPagamento: "DÉBITO" },
  { id: 20, nomeCliente: "PATRÍCIA DIAS SANTANA", dataPedido: "17/08/2025", dataAgendada: "17/08/2025", status: "Entregue", valor: "R$ 200,57", formaPagamento: "DINHEIRO" },
]

type Filters = {
  dataPedido: { de: string; ate: string }
  dataAgendada: { de: string; ate: string }
  dataEntrega: { de: string; ate: string }
  status: string
  cliente: { id: string; nome: string; cpf: string }
}

export function OrdersTable({
  filters,
  currentPage,
  onPageChange,
}: {
  filters: Filters
  currentPage: number
  onPageChange: (page: number) => void
}) {
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchNome =
        !filters.cliente.nome ||
        order.nomeCliente
          .toLowerCase()
          .includes(filters.cliente.nome.toLowerCase())

      const matchStatus =
        !filters.status ||
        order.status.toLowerCase() === filters.status.toLowerCase()

      const matchDataPedidoDe =
        !filters.dataPedido.de ||
        new Date(order.dataPedido.split("/").reverse().join("-")) >=
          new Date(filters.dataPedido.de)

      const matchDataPedidoAte =
        !filters.dataPedido.ate ||
        new Date(order.dataPedido.split("/").reverse().join("-")) <=
          new Date(filters.dataPedido.ate)

      return matchNome && matchStatus && matchDataPedidoDe && matchDataPedidoAte
    })
  }, [filters])

  const pageSize = 10
  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left text-gray-700">
        <thead className="bg-gray-200 text-gray-800 uppercase text-xs">
          <tr>
            <th className="py-3 px-4">ID</th>
            <th className="py-3 px-4">Nome Cliente</th>
            <th className="py-3 px-4">Data do Pedido</th>
            <th className="py-3 px-4">Data Agendada</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Valor</th>
            <th className="py-3 px-4">Forma Pagamento</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map((order) => (
            <tr
              key={order.id}
              className="border-b hover:bg-gray-100 transition-colors"
            >
              <td className="py-2 px-4">{order.id}</td>
              <td className="py-2 px-4">{order.nomeCliente}</td>
              <td className="py-2 px-4">{order.dataPedido}</td>
              <td className="py-2 px-4">{order.dataAgendada}</td>
              <td className="py-2 px-4">{order.status}</td>
              <td className="py-2 px-4">{order.valor}</td>
              <td className="py-2 px-4">{order.formaPagamento}</td>
              <td className="py-2 px-4">
                <Button variant="link" className="text-red-600 font-semibold">
                  VER MAIS
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredOrders.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          Nenhum pedido encontrado.
        </p>
      )}

      {/* Paginação */}
      <div className="flex justify-center items-center gap-2 py-4">
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Anterior
        </Button>
        <span className="text-sm text-gray-700">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}
