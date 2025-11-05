"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

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

const LS_KEY = "meatshop.inventory.v1"

// 🔧 utilitários para storage
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

// 🔢 cálculo automático de status
function calcularStatus(produto: Produto): Produto["status"] {
  if (produto.status === "INATIVO") return "INATIVO"
  if (produto.status === "ATIVO" && produto.promocaoAtiva) return "EM PROMOÇÃO"
  return "ATIVO"
}

export default function NovoProdutoPage() {
  const router = useRouter()

  const [produto, setProduto] = useState<Produto>({
    id: Date.now(), // id provisório
    nome: "",
    categoria: "",
    corte: "",
    marca: "",
    observacoes: "",
    quantidade: "",
    valor: 0,
    valorPromocional: 0,
    promocaoAtiva: false,
    status: "ATIVO",
    descricao: "",
  })

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [ok, setOk] = useState(false)

  const handleChange = (key: keyof Produto, value: any) => {
    let atualizado = { ...produto, [key]: value }

    // regra: inativo => sem promoção
    if (key === "status" && value === "INATIVO") {
      atualizado.promocaoAtiva = false
    }

    atualizado.status = calcularStatus(atualizado)
    setProduto(atualizado)
    setErro("")
    setOk(false)
  }

  const handleSave = () => {
    // validações simples
    if (!produto.nome.trim() || !produto.categoria.trim() || produto.valor <= 0) {
      setErro("Preencha pelo menos o nome, categoria e valor do produto.")
      return
    }

    setSalvando(true)

    // gera id sequencial simples
    const storage = loadFromStorage()
    const ids = Object.values(storage).map((p) => p.id)
    const novoId = ids.length ? Math.max(...ids) + 1 : 1

    const novoProduto = {
      ...produto,
      id: novoId,
      status: calcularStatus(produto),
    }

    storage[novoId.toString().padStart(5, "0")] = novoProduto
    saveToStorage(storage)

    setSalvando(false)
    setOk(true)

    // volta pro estoque depois de 1s
    setTimeout(() => {
      router.push("/estoque")
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat flex items-start justify-center py-8">
      <div className="relative w-[960px] max-w-[96vw] bg-[#D9D9D9] rounded-xl shadow-lg p-5 border border-gray-400">
        {/* Botão voltar */}
        <button
          onClick={() => router.back()}
          className="absolute top-3 right-4 text-red-700 font-bold text-2xl hover:scale-110 transition-transform"
        >
          ✕
        </button>

        <h2 className="text-center text-2xl font-extrabold text-red-700 mb-4">
          Novo Produto
        </h2>

        {erro && (
          <div className="mb-3 rounded-md bg-red-100 text-red-700 px-3 py-2 text-sm border border-red-300">
            {erro}
          </div>
        )}

        {ok && (
          <div className="mb-3 rounded-md bg-green-100 text-green-800 px-3 py-2 text-sm border border-green-300">
            Produto adicionado com sucesso!
          </div>
        )}

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
            <fieldset key={f.key} className="border border-gray-400 rounded-md px-3 py-2">
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
            <input
              type="text"
              value={produto.quantidade}
              onChange={(e) => handleChange("quantidade", e.target.value)}
              placeholder="Ex: 50 KG"
              className="bg-[#EDEDED] text-center text-sm rounded-md border border-gray-300 py-2 w-full"
            />
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

        {/* Botão Salvar */}
        <div className="flex justify-center mt-5">
          <button
            onClick={handleSave}
            disabled={salvando}
            className="bg-[#A0332C] hover:bg-[#7F2721] text-white px-12 py-2 rounded-md font-semibold text-lg shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}
