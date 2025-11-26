"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiGet, apiPatch } from "@/lib/api"

// ========= Tipagem do Produto =========
type Produto = {
  id: number
  nome: string
  categoria: string
  corte: string
  marca: string
  observacoes: string
  quantidade: string
  valor: number
  valorPromocional: number
  promocaoAtiva: boolean
  status: "ATIVO" | "INATIVO" | "EM PROMOÇÃO"
  descricao: string
}
// ======================================

// Converte status do backend → frontend
function apiToUiStatus(status: string): Produto["status"] {
  if (status === "ON_SALE") return "EM PROMOÇÃO"
  if (status === "INACTIVE") return "INATIVO"
  return "ATIVO"
}

// Converte status do frontend → backend
function uiToApiStatus(status: Produto["status"]): "ACTIVE" | "INACTIVE" | "ON_SALE" {
  if (status === "EM PROMOÇÃO") return "ON_SALE"
  if (status === "INATIVO") return "INACTIVE"
  return "ACTIVE"
}

// Regras de status (mesmas do backend)
function calcularStatus(produto: Produto): Produto["status"] {
  if (produto.status === "INATIVO") return "INATIVO"
  if (produto.promocaoAtiva && produto.status === "ATIVO") return "EM PROMOÇÃO"
  return produto.status
}

export default function ProdutoDetalhesPage() {
  const { id } = useParams()
  const router = useRouter()
  const produtoId = useMemo(() => Number(id), [id])
  const produtoKey = produtoId.toString().padStart(5, "0")

  const [produto, setProduto] = useState<Produto | null>(null)
  const [saved, setSaved] = useState(false)

  // ========= CARREGAR PRODUTO DO BACKEND =========
  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet(`/products/${produtoId}`)

        if (!res.ok) {
          console.error("Produto não encontrado")
          return
        }

        const p = res.data

        setProduto({
          id: p.id,
          nome: p.name,
          descricao: p.description,
          categoria: p.category,
          corte: p.cut,
          marca: p.brand ?? "",
          observacoes: p.notes ?? "",
          quantidade: p.quantity,
          valor: p.price,
          valorPromocional: p.promotionalPrice ?? 0,
          promocaoAtiva: p.promotionActive,
          status: apiToUiStatus(p.status),
        })
      } catch (err) {
        console.error("Erro ao carregar produto:", err)
      }
    }

    load()
  }, [produtoId])
  // ==================================================

  const handleChange = (key: keyof Produto, value: any) => {
    if (!produto) return

    let updated = { ...produto, [key]: value }

    // Se ficar inativo, promoção desliga automaticamente
    if (key === "status" && value === "INATIVO") {
      updated.promocaoAtiva = false
    }

    updated.status = calcularStatus(updated)
    setProduto(updated)
    setSaved(false)
  }

  // ========= SALVAR NO BACKEND =========
  async function handleSave() {
    if (!produto) return

    try {
      const body = {
        name: produto.nome,
        description: produto.descricao,
        category: produto.categoria,
        cut: produto.corte,
        brand: produto.marca,
        notes: produto.observacoes,
        quantity: produto.quantidade,
        price: produto.valor,
        promotionalPrice: produto.valorPromocional || null,
        promotionActive: produto.promocaoAtiva,
        status: uiToApiStatus(produto.status),
      }

      await apiPatch(`/products/${produto.id}`, body)

      setSaved(true)
      router.push("/estoque")
    } catch (err) {
      console.error("Erro ao salvar produto:", err)
    }
  }
  // =====================================

  if (!produto) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 text-lg">
        Produto não encontrado.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat flex items-start justify-center py-8">
      <div className="relative w-[960px] max-w-[96vw] bg-[#D9D9D9] rounded-xl shadow-lg p-5 border border-gray-400">
        <button
          onClick={() => router.back()}
          className="absolute top-3 right-4 text-red-700 font-bold text-2xl hover:scale-110 transition-transform"
        >
          ✕
        </button>

        {saved && (
          <div className="mb-3 rounded-md bg-green-100 text-green-800 px-3 py-2 text-sm border border-green-300">
            Alterações salvas com sucesso.
          </div>
        )}

        <h2 className="text-center text-2xl font-extrabold text-red-700 mb-3">
          Produto #{produtoKey}
        </h2>

        {/* Linha 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <fieldset className="border-2 border-[#A0332C] rounded-md px-3 py-1">
            <legend className="text-[#A0332C] font-semibold px-1 text-sm">Status</legend>
            <select
              value={produto.status === "EM PROMOÇÃO" ? "ATIVO" : produto.status}
              onChange={(e) =>
                handleChange("status", e.target.value as Produto["status"])
              }
              className="w-full bg-white/60 rounded-md px-3 py-2 text-[#A0332C] font-bold"
            >
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </fieldset>

          <fieldset className="border-2 border-[#A0332C] rounded-md px-3 py-1">
            <legend className="text-[#A0332C] font-semibold px-1 text-sm">Produto</legend>
            <input
              type="text"
              value={produto.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              className="w-full bg-white/60 rounded-md px-3 py-2 font-semibold text-gray-800"
            />
          </fieldset>
        </div>

        {/* Linha 2 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: "Categoria", key: "categoria" },
            { label: "Corte", key: "corte" },
            { label: "Marca", key: "marca" },
            { label: "Observações adicionais", key: "observacoes" },
          ].map((f) => (
            <fieldset
              key={f.key}
              className="border border-gray-400 rounded-md px-3 py-2"
            >
              <legend className="text-gray-600 font-medium px-1 text-sm">{f.label}</legend>
              <input
                type="text"
                value={(produto as any)[f.key]}
                onChange={(e) => handleChange(f.key as keyof Produto, e.target.value)}
                className="w-full bg-white/60 rounded-md px-3 py-2 text-gray-800"
              />
            </fieldset>
          ))}
        </div>

        {/* Linha 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2 text-center">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Quantidade em estoque
            </legend>
            <div className="text-2xl font-extrabold text-gray-800 mt-1">
              {produto.quantidade}
            </div>
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Valores</legend>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">VALOR DO PRODUTO</label>
                <input
                  type="number"
                  value={produto.valor}
                  onChange={(e) => handleChange("valor", parseFloat(e.target.value) || 0)}
                  className="bg-[#EDEDED] text-center text-sm rounded-md border border-gray-300 py-2"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">VALOR PROMOCIONAL</label>
                <input
                  type="number"
                  value={produto.valorPromocional}
                  onChange={(e) =>
                    handleChange("valorPromocional", parseFloat(e.target.value) || 0)
                  }
                  className="bg-[#EDEDED] text-center text-sm rounded-md border border-gray-300 py-2"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">PROMOÇÃO ATIVA</label>
                <select
                  value={produto.promocaoAtiva ? "true" : "false"}
                  onChange={(e) =>
                    handleChange("promocaoAtiva", e.target.value === "true")
                  }
                  disabled={produto.status === "INATIVO"}
                  className={`text-sm font-semibold text-center rounded-md border border-gray-300 py-2 ${
                    produto.promocaoAtiva
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  } ${produto.status === "INATIVO" ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <option value="true">✓</option>
                  <option value="false">✗</option>
                </select>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Linha 4 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Descrição do produto
            </legend>
            <textarea
              value={produto.descricao}
              onChange={(e) => handleChange("descricao", e.target.value)}
              className="resize-none bg-[#EDEDED] w-full h-[110px] p-3 text-sm border border-gray-300 rounded-md focus:outline-none"
            />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Imagem do produto
            </legend>
            <div className="flex items-center justify-center bg-[#EDEDED] h-[110px] border-2 border-dashed border-gray-400 rounded-md text-gray-400 text-5xl font-light">
              +
            </div>
          </fieldset>
        </div>

        {/* Botão Editar */}
        <div className="flex justify-center mt-5">
          <button
            onClick={handleSave}
            className="bg-[#A0332C] hover:bg-[#7F2721] text-white px-12 py-2 rounded-md font-semibold text-lg shadow-md"
          >
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}
