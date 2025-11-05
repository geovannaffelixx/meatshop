"use client"

import React, { useMemo } from "react"
import { useRouter } from "next/navigation"

interface Filters {
  dataPedido: { de: string; ate: string }
  dataAgendada: { de: string; ate: string }
  dataEntrega: { de: string; ate: string }
  status: string
  cliente: { id: string; nome: string; cpf: string }
}

interface OrdersTableProps {
  filters: Filters
  currentPage: number
  onPageChange: (page: number) => void
}

type Pedido = {
  id: number
  cliente: string
  cpf: string
  dataPedido: string      // YYYY-MM-DD
  dataAgendada: string    // YYYY-MM-DD
  dataEntrega: string     // YYYY-MM-DD
  status: "Pendente" | "Entregue" | "Cancelado"
  valor: number
  formaPagamento: string
}

export function OrdersTable({ filters, currentPage, onPageChange }: OrdersTableProps) {
  const router = useRouter()

  // 🔹 Mock – incluiu CPF e os 3 status pedidos
  const pedidos: Pedido[] = [
    { id: 1,  cliente: "AMANDA TERESA FÉLIX", cpf: "714.335.491-07", dataPedido: "2025-08-20", dataAgendada: "2025-08-23", dataEntrega: "2025-08-23", status: "Pendente", valor: 159.68, formaPagamento: "DINHEIRO" },
    { id: 2,  cliente: "FLÁVIO FELIPE COUTO", cpf: "222.222.222-22", dataPedido: "2025-08-20", dataAgendada: "2025-08-21", dataEntrega: "2025-08-21", status: "Entregue", valor: 111.28, formaPagamento: "CRÉDITO" },
    { id: 3,  cliente: "RICARDO NOGUEIRA SILVA", cpf: "333.333.333-33", dataPedido: "2025-08-20", dataAgendada: "2025-08-21", dataEntrega: "2025-08-21", status: "Entregue", valor: 630.64, formaPagamento: "CRÉDITO" },
    { id: 4,  cliente: "FERNANDA ALVES MOURA", cpf: "444.444.444-44", dataPedido: "2025-08-20", dataAgendada: "2025-08-21", dataEntrega: "2025-08-21", status: "Cancelado", valor: 55.40, formaPagamento: "CRÉDITO" },
    { id: 5,  cliente: "LUCAS PEREIRA ANDRADE", cpf: "555.555.555-55", dataPedido: "2025-08-20", dataAgendada: "2025-08-20", dataEntrega: "2025-08-20", status: "Pendente", valor: 81.99, formaPagamento: "DÉBITO" },
    { id: 6,  cliente: "CAMILA ROCHA MARTINS", cpf: "666.666.666-66", dataPedido: "2025-08-20", dataAgendada: "2025-08-20", dataEntrega: "2025-08-20", status: "Entregue", valor: 215.18, formaPagamento: "DINHEIRO" },
    { id: 7,  cliente: "JOÃO VICTOR BARBOSA LIMA", cpf: "777.777.777-77", dataPedido: "2025-08-20", dataAgendada: "2025-08-20", dataEntrega: "2025-08-20", status: "Entregue", valor: 281.36, formaPagamento: "DÉBITO" },
    { id: 8,  cliente: "MARIANA COSTA FIGUEIREDO", cpf: "888.888.888-88", dataPedido: "2025-08-20", dataAgendada: "2025-08-20", dataEntrega: "2025-08-20", status: "Entregue", valor: 158.97, formaPagamento: "DINHEIRO" },
    { id: 9,  cliente: "RAFAEL TORRES ALMEIDA", cpf: "999.999.999-99", dataPedido: "2025-08-20", dataAgendada: "2025-08-20", dataEntrega: "2025-08-20", status: "Entregue", valor: 151.22, formaPagamento: "DÉBITO" },
    { id: 10, cliente: "ALINE CARVALHO DUARTE", cpf: "010.010.010-10", dataPedido: "2025-08-19", dataAgendada: "2025-08-20", dataEntrega: "2025-08-20", status: "Entregue", valor: 41.33,  formaPagamento: "DÉBITO" },
    { id: 11, cliente: "BRUNO HENRIQUE MOREIRA", cpf: "011.011.011-11", dataPedido: "2025-08-19", dataAgendada: "2025-08-19", dataEntrega: "2025-08-19", status: "Entregue", valor: 215.18, formaPagamento: "PIX" },
    { id: 12, cliente: "JULIANA MENDES FREITAS", cpf: "012.012.012-12", dataPedido: "2025-08-19", dataAgendada: "2025-08-19", dataEntrega: "2025-08-19", status: "Entregue", valor: 331.45, formaPagamento: "CRÉDITO" },
    { id: 13, cliente: "FELIPE RAMOS CARDOSO", cpf: "013.013.013-13", dataPedido: "2025-08-19", dataAgendada: "2025-08-19", dataEntrega: "2025-08-19", status: "Cancelado", valor: 220.33, formaPagamento: "DÉBITO" },
    { id: 14, cliente: "BEATRIZ OLIVEIRA CASTRO", cpf: "014.014.014-14", dataPedido: "2025-08-18", dataAgendada: "2025-08-18", dataEntrega: "2025-08-18", status: "Cancelado", valor: 481.88, formaPagamento: "CRÉDITO" },
    { id: 15, cliente: "ANDRÉ LUIZ FONSECA", cpf: "015.015.015-15", dataPedido: "2025-08-18", dataAgendada: "2025-08-18", dataEntrega: "2025-08-18", status: "Entregue", valor: 117.21, formaPagamento: "DINHEIRO" },
    { id: 16, cliente: "CAROLINA PIRES GONÇALVES", cpf: "016.016.016-16", dataPedido: "2025-08-18", dataAgendada: "2025-08-18", dataEntrega: "2025-08-18", status: "Entregue", valor: 301.22, formaPagamento: "DINHEIRO" },
    { id: 17, cliente: "GABRIEL SOUZA TAVARES", cpf: "017.017.017-17", dataPedido: "2025-08-18", dataAgendada: "2025-08-18", dataEntrega: "2025-08-18", status: "Entregue", valor: 184.82, formaPagamento: "CRÉDITO" },
    { id: 18, cliente: "LARISSA MONTEIRO CAMP", cpf: "018.018.018-18", dataPedido: "2025-08-18", dataAgendada: "2025-08-18", dataEntrega: "2025-08-18", status: "Entregue", valor: 235.66, formaPagamento: "DINHEIRO" },
    { id: 19, cliente: "THIAGO FERREIRA GOMES", cpf: "019.019.019-19", dataPedido: "2025-08-17", dataAgendada: "2025-08-17", dataEntrega: "2025-08-17", status: "Cancelado", valor: 98.55,  formaPagamento: "DÉBITO" },
    { id: 20, cliente: "PATRÍCIA DIAS SANTANA", cpf: "020.020.020-20", dataPedido: "2025-08-17", dataAgendada: "2025-08-17", dataEntrega: "2025-08-17", status: "Entregue", valor: 200.57, formaPagamento: "DINHEIRO" },
  ]

  // 🔧 util: checa intervalo de data (YYYY-MM-DD) de forma segura
  const inRange = (valueISO: string, de: string, ate: string) => {
    if (!de && !ate) return true
    const v = new Date(valueISO + "T00:00:00")
    const from = de ? new Date(de + "T00:00:00") : null
    const to   = ate ? new Date(ate + "T23:59:59") : null
    return (!from || v >= from) && (!to || v <= to)
  }

  // 🔍 aplica TODOS os filtros, incluindo Data Agendada (corrigido)
  const filtered = useMemo(() => {
    return pedidos.filter((p) => {
      const idOk    = filters.cliente.id ? p.id.toString().includes(filters.cliente.id) : true
      const nomeOk  = filters.cliente.nome ? p.cliente.toLowerCase().includes(filters.cliente.nome.toLowerCase()) : true
      const cpfOk   = filters.cliente.cpf ? p.cpf.includes(filters.cliente.cpf) : true
      const statusOk = filters.status ? p.status === (filters.status as Pedido["status"]) : true

      const dataPedidoOk   = inRange(p.dataPedido,   filters.dataPedido.de,   filters.dataPedido.ate)
      const dataAgendadaOk = inRange(p.dataAgendada, filters.dataAgendada.de, filters.dataAgendada.ate)   // ✅ corrigido
      const dataEntregaOk  = inRange(p.dataEntrega,  filters.dataEntrega.de,  filters.dataEntrega.ate)

      return idOk && nomeOk && cpfOk && statusOk && dataPedidoOk && dataAgendadaOk && dataEntregaOk
    })
  }, [filters])

  // 🔢 paginação
  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const start = (safePage - 1) * itemsPerPage
  const pageData = filtered.slice(start, start + itemsPerPage)

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages) onPageChange(page)
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-300 p-4">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700 font-semibold">
          <tr>
            <th className="p-2">ID</th>
            <th className="p-2">Nome Cliente</th>
            <th className="p-2">Data do Pedido</th>
            <th className="p-2">Data Agendada</th>
            <th className="p-2">Status do pedido</th>
            <th className="p-2">Valor</th>
            <th className="p-2">Forma de pagamento</th>
            <th className="p-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {pageData.length > 0 ? (
            pageData.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors">
                <td className="p-2">{p.id}</td>
                <td className="p-2">{p.cliente}</td>
                <td className="p-2">{p.dataPedido}</td>
                <td className="p-2">{p.dataAgendada}</td>
                <td className="p-2">{p.status}</td>
                <td className="p-2">R$ {p.valor.toFixed(2)}</td>
                <td className="p-2">{p.formaPagamento}</td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => router.push(`/pedidos/${p.id}`)}
                    className="text-red-600 font-semibold hover:underline"
                  >
                    VER MAIS
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="text-center p-4 text-gray-500 italic">
                Nenhum pedido encontrado com os filtros aplicados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* paginação */}
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          onClick={() => changePage(safePage - 1)}
          className="px-2 text-gray-600 disabled:opacity-50"
          disabled={safePage === 1}
        >
          {"<"}
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => changePage(i + 1)}
            className={`px-2 ${safePage === i + 1 ? "text-red-700 font-bold" : "text-gray-600"}`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => changePage(safePage + 1)}
          className="px-2 text-gray-600 disabled:opacity-50"
          disabled={safePage === totalPages}
        >
          {">"}
        </button>
      </div>
    </div>
  )
}
