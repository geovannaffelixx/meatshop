"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Produto = {
  id: number
  descricao: string
  categoria: string
  marca: string
  quantidade: string
  valor: number
  status: string
}

const LS_KEY = "meatshop.inventory.v1"

function loadOverrides(): Record<string, any> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}")
  } catch {
    return {}
  }
}

// 🔧 Recalcula o status conforme regras globais
function calcularStatus(local: any): string {
  if (local.status === "INATIVO") return "INATIVO"
  if (local.promocaoAtiva && local.status !== "INATIVO") return "EM PROMOÇÃO"
  return "ATIVO"
}

export function EstoqueTable({
  filters,
  currentPage,
  onPageChange,
}: {
  filters: any
  currentPage: number
  onPageChange: (page: number) => void
}) {
  const router = useRouter()

  // Mock inicial
  const baseProdutos: Produto[] = [
    {
      id: 1,
      descricao: "FILÉ MIGNON",
      categoria: "BOVINO",
      marca: "FRIBOI",
      quantidade: "60,00 KG",
      valor: 111.28,
      status: "EM PROMOÇÃO",
    },
    {
      id: 2,
      descricao: "CHANDANGA",
      categoria: "BOVINO",
      marca: "SWIFT",
      quantidade: "45,90 KG",
      valor: 111.28,
      status: "ATIVO",
    },
    {
      id: 3,
      descricao: "ALCATRA",
      categoria: "BOVINO",
      marca: "FRIBOI",
      quantidade: "50,80 KG",
      valor: 630.44,
      status: "ATIVO",
    },
    {
      id: 16,
      descricao: "COSTELA",
      categoria: "BOVINO",
      marca: "MINERVA FOODS",
      quantidade: "700 KG",
      valor: 69.9,
      status: "ATIVO",
    },
  ]

  const [produtos, setProdutos] = useState<Produto[]>(baseProdutos)

  // 🧩 Atualiza com dados do localStorage
  const applyOverrides = () => {
    const overrides = loadOverrides()
    const mapOverrides = Object.values(overrides)

    // Combina mock + novos itens
    const merged = [
      ...baseProdutos.map((p) => {
        const key = String(p.id).padStart(5, "0")
        const local = overrides[key]
        if (!local) return p

        return {
          ...p,
          descricao: local.nome || p.descricao,
          marca: local.marca || p.marca,
          categoria: local.categoria || p.categoria,
          quantidade: local.quantidade || p.quantidade,
          valor: local.promocaoAtiva
            ? local.valorPromocional
            : local.valor || p.valor,
          status: calcularStatus(local),
        }
      }),

      // Adiciona produtos criados manualmente (que não existem no mock)
      ...mapOverrides
        .filter(
          (local: any) =>
            !baseProdutos.some((p) => p.id === local.id) // evita duplicação
        )
        .map((local: any) => ({
          id: local.id,
          descricao: local.nome,
          categoria: local.categoria,
          marca: local.marca,
          quantidade: local.quantidade,
          valor: local.promocaoAtiva
            ? local.valorPromocional
            : local.valor,
          status: calcularStatus(local),
        })),
    ]

    // Ordena (mais recente primeiro)
    const ordenado = merged.sort((a, b) => b.id - a.id)
    setProdutos(ordenado)
  }

  // 🧠 Atualiza automaticamente sempre que o estoque muda
  useEffect(() => {
    applyOverrides()

    const h = () => applyOverrides()
    window.addEventListener("storage", h)
    window.addEventListener("estoque:updated", h)
    return () => {
      window.removeEventListener("storage", h)
      window.removeEventListener("estoque:updated", h)
    }
  }, [])

  // 🔍 Filtros simples
  const filtered = produtos.filter((p) => {
    const idMatch = filters.id ? p.id.toString().includes(filters.id) : true
    const descMatch = filters.descricao
      ? p.descricao.toLowerCase().includes(filters.descricao.toLowerCase())
      : true
    const catMatch = filters.categoria
      ? p.categoria.toLowerCase().includes(filters.categoria.toLowerCase())
      : true
    const statusMatch = filters.status
      ? p.status.toLowerCase().includes(filters.status.toLowerCase())
      : true
    return idMatch && descMatch && catMatch && statusMatch
  })

  // 📄 Paginação
  const itemsPerPage = 10
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse bg-white rounded-xl overflow-hidden shadow">
        <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Descrição do produto</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Marca</th>
            <th className="px-4 py-3">Qtd. Disponível (KG)</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((p) => (
            <tr
              key={p.id}
              className="border-b border-gray-200 hover:bg-gray-100 transition"
            >
              <td className="px-4 py-3">{p.id}</td>
              <td className="px-4 py-3 font-semibold">{p.descricao}</td>
              <td className="px-4 py-3">{p.categoria}</td>
              <td className="px-4 py-3">{p.marca}</td>
              <td className="px-4 py-3">{p.quantidade}</td>
              <td className="px-4 py-3">
                R$ {p.valor.toFixed(2).replace(".", ",")}
              </td>
              <td
                className={`px-4 py-3 font-semibold ${
                  p.status === "EM PROMOÇÃO"
                    ? "text-green-600"
                    : p.status === "INATIVO"
                    ? "text-gray-500"
                    : "text-red-700"
                }`}
              >
                {p.status}
              </td>
              <td className="px-4 py-3 text-center">
                <Button
                  onClick={() => router.push(`/estoque/${p.id}`)}
                  className="bg-transparent text-red-600 hover:text-red-800 font-bold underline-offset-2 hover:underline"
                >
                  VER MAIS
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginação */}
      <div className="flex justify-center items-center mt-4 gap-2">
        <Button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded-md"
        >
          {"<"}
        </Button>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i + 1)}
            className={`px-3 py-1 rounded-md text-sm font-semibold ${
              currentPage === i + 1
                ? "bg-red-700 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <Button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded-md"
        >
          {">"}
        </Button>
      </div>
    </div>
  )
}
