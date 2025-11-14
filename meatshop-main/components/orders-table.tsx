"use client"

import React, { useMemo, useEffect, useState } from "react"
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
  cpfCnpj?: string
  status: "Pendente" | "Entregue" | "Cancelado"
  valor: number
  formaPagamento?: string
  criadoEm?: string
  dataAgendada?: string
  dataEntrega?: string
}

export function OrdersTable({ filters, currentPage, onPageChange }: OrdersTableProps) {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 🔹 Busca dados reais do backend
  useEffect(() => {
    const params = new URLSearchParams()
    params.set("page", String(currentPage))
    params.set("pageSize", "10")
    if (filters.status) params.set("status", filters.status)
    if (filters.cliente?.nome) params.set("clienteNome", filters.cliente.nome)
    if (filters.dataPedido?.de) params.set("dataPedidoDe", filters.dataPedido.de)
    if (filters.dataPedido?.ate) params.set("dataPedidoAte", filters.dataPedido.ate)

    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders?${params.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Erro ${res.status}`)
        const data = await res.json()
        return data.data ?? []
      })
      .then(setPedidos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filters, currentPage])

  // 🔧 util: checa intervalo de data (YYYY-MM-DD) de forma segura
  const inRange = (valueISO: string, de: string, ate: string) => {
    if (!de && !ate) return true
    const v = new Date(valueISO + "T00:00:00")
    const from = de ? new Date(de + "T00:00:00") : null
    const to = ate ? new Date(ate + "T23:59:59") : null
    return (!from || v >= from) && (!to || v <= to)
  }

  // 🔍 aplica filtros locais (mantém UX da tela)
  const filtered = useMemo(() => {
    return pedidos.filter((p: Pedido) => {
      const idOk = filters.cliente.id ? p.id.toString().includes(filters.cliente.id) : true
      const nomeOk = filters.cliente.nome
        ? p.cliente.toLowerCase().includes(filters.cliente.nome.toLowerCase())
        : true
      const cpfOk = filters.cliente.cpf ? (p.cpfCnpj ?? "").includes(filters.cliente.cpf) : true
      const statusOk = filters.status ? p.status === (filters.status as Pedido["status"]) : true

      const dataPedidoOk = inRange(p.criadoEm ?? "", filters.dataPedido.de, filters.dataPedido.ate)
      const dataAgendadaOk = inRange(p.dataAgendada ?? "", filters.dataAgendada.de, filters.dataAgendada.ate)
      const dataEntregaOk = inRange(p.dataEntrega ?? "", filters.dataEntrega.de, filters.dataEntrega.ate)

      return idOk && nomeOk && cpfOk && statusOk && dataPedidoOk && dataAgendadaOk && dataEntregaOk
    })
  }, [filters, pedidos])

  // 🔢 paginação local (mantém mesmo layout)
  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const start = (safePage - 1) * itemsPerPage
  const pageData = filtered.slice(start, start + itemsPerPage)

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages) onPageChange(page)
  }

  // 🔄 estados de carregamento e erro
  if (loading) {
    return <div className="p-4 text-gray-500 italic">Carregando pedidos...</div>
  }
  if (error) {
    return <div className="p-4 text-red-600 font-semibold">Erro: {error}</div>
  }

  // 🧾 tabela renderizada
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
                <td className="p-2">{p.criadoEm?.substring(0, 10) ?? "-"}</td>
                <td className="p-2">{p.dataAgendada?.substring(0, 10) ?? "-"}</td>
                <td className="p-2">{p.status}</td>
                <td className="p-2">R$ {p.valor?.toFixed(2)}</td>
                <td className="p-2">{p.formaPagamento ?? "-"}</td>
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
