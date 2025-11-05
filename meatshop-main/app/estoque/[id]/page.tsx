"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

// ========== MOCK INICIAL ==========
const BASE_PRODUTOS = [
  {
    id: 1,
    nome: "FILÉ MIGNON",
    categoria: "BOVINO",
    corte: "FILÉ",
    marca: "FRIBOI",
    observacoes: "---",
    quantidade: "60 KG",
    valor: 111.28,
    valorPromocional: 99.99,
    promocaoAtiva: true,
    status: "ATIVO",
    descricao: "Filé Mignon de alta qualidade, ideal para grelhar ou assar.",
  },
  {
    id: 2,
    nome: "CHANDANGA",
    categoria: "BOVINO",
    corte: "CHÃ",
    marca: "SWIFT",
    observacoes: "---",
    quantidade: "45 KG",
    valor: 111.28,
    valorPromocional: 95.5,
    promocaoAtiva: false,
    status: "INATIVO",
    descricao: "Carne bovina de primeira, indicada para cozidos e ensopados.",
  },
  {
    id: 3,
    nome: "ALCATRA",
    categoria: "BOVINO",
    corte: "ALCATRA",
    marca: "FRIBOI",
    observacoes: "---",
    quantidade: "50 KG",
    valor: 630.44,
    valorPromocional: 580.0,
    promocaoAtiva: true,
    status: "ATIVO",
    descricao: "Corte nobre bovino, suculento e ideal para churrascos.",
  },
  {
    id: 16,
    nome: "COSTELA BOVINA MINERVA FOODS",
    categoria: "CARNE BOVINA",
    corte: "COSTELA",
    marca: "MINERVA FOODS",
    observacoes: "---",
    quantidade: "700 KG",
    valor: 69.9,
    valorPromocional: 59.99,
    promocaoAtiva: true,
    status: "ATIVO",
    descricao: "Costela bovina com ótima marmorização, ideal para o forno ou churrasqueira.",
  },
]
// ===================================

type Produto = typeof BASE_PRODUTOS[number]

const LS_KEY = "meatshop.inventory.v1"

function loadFromStorage(): Record<string, Produto> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}")
  } catch {
    return {}
  }
}

function saveToStorage(map: Record<string, Produto>) {
  localStorage.setItem(LS_KEY, JSON.stringify(map))
  window.dispatchEvent(new Event("estoque:updated"))
}

// Função que calcula o status correto com base nas regras
function calcularStatus(produto: Produto): Produto["status"] {
  if (produto.status === "INATIVO") return "INATIVO"
  if (produto.status === "ATIVO" && produto.promocaoAtiva) return "EM PROMOÇÃO"
  return "ATIVO"
}

export default function ProdutoDetalhesPage() {
  const { id } = useParams()
  const router = useRouter()
  const produtoId = useMemo(() => Number(id), [id])
  const produtoKey = produtoId.toString().padStart(5, "0")

  const [produto, setProduto] = useState<Produto | null>(null)
  const [saved, setSaved] = useState(false)

  // Carrega o produto certo (mock + storage)
  useEffect(() => {
    const storage = loadFromStorage()
    const local = storage[produtoKey]
    const base = BASE_PRODUTOS.find((p) => p.id === produtoId)
    const inicial = local || base || null

    if (inicial) {
      // Garante que o status inicial seja coerente
      inicial.status = calcularStatus(inicial)
    }

    setProduto(inicial)
  }, [produtoId, produtoKey])

  const handleChange = (key: keyof Produto, value: any) => {
    if (!produto) return
    let updated = { ...produto, [key]: value }

    // Se inativo → remove promoção automaticamente
    if (key === "status" && value === "INATIVO") {
      updated.promocaoAtiva = false
    }

    // Recalcula o status baseado nas regras
    updated.status = calcularStatus(updated)
    setProduto(updated)
    setSaved(false)
  }

  const handleSave = () => {
    if (!produto) return
    const map = loadFromStorage()
    const atualizado = { ...produto, status: calcularStatus(produto) }
    map[produtoKey] = atualizado
    saveToStorage(map)
    setSaved(true)
  }

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
                  disabled={produto.status === "INATIVO"} // bloqueia se inativo
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
