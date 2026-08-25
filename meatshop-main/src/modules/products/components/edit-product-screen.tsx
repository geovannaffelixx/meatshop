"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { apiGet, apiPatch } from "@/shared/lib/api"
import { Spinner } from "@/shared/components/ui/spinner"

type Product = {
  id: number
  name: string
  description: string
  price: number
  unit_of_measure: string
  active: boolean
  unit_id: number
  category_id: number
  brand: string | null
}

type Stock = {
  quantity: number
  min_quantity: number
}

type Category = { id: number; name: string }

export function EditProductScreen() {
  const { id } = useParams()
  const router = useRouter()
  const produtoId = useMemo(() => Number(id), [id])
  const produtoKey = produtoId.toString().padStart(5, "0")

  const [product, setProduct] = useState<Product | null>(null)
  const [stock, setStock] = useState<Stock>({ quantity: 0, min_quantity: 0 })
  const [categories, setCategories] = useState<Category[]>([])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet(`/products/${produtoId}`)
      .then((res: { product: Product; stock: Stock | null }) => {
        setProduct(res.product)
        setStock(res.stock ?? { quantity: 0, min_quantity: 0 })
        return apiGet(`/categories?unit_id=${res.product.unit_id}`)
      })
      .then((cats) => setCategories(cats ?? []))
      .catch((err) => setError(err.message))
  }, [produtoId])

  const handleChange = <K extends keyof Product>(key: K, value: Product[K]) => {
    if (!product) return
    setProduct({ ...product, [key]: value })
    setSaved(false)
  }

  async function handleSave() {
    if (!product || saving) return

    setSaving(true)
    try {
      await apiPatch(`/products/${product.id}`, {
        name: product.name,
        description: product.description,
        price: product.price,
        unit_of_measure: product.unit_of_measure,
        active: product.active,
        category_id: product.category_id,
        brand: product.brand || undefined,
      })

      await apiPatch(`/products/${product.id}/stock`, {
        quantity: stock.quantity,
        min_quantity: stock.min_quantity,
      })

      setSaved(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar produto.")
    } finally {
      setSaving(false)
    }
  }

  if (error && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-lg">
        Erro ao carregar produto: {error}
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 text-lg">
        Carregando produto...
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
        {error && (
          <div className="mb-3 rounded-md bg-red-100 text-red-700 px-3 py-2 text-sm border border-red-300">
            {error}
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
              value={product.active ? "ATIVO" : "INATIVO"}
              onChange={(e) => handleChange("active", e.target.value === "ATIVO")}
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
              value={product.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full bg-white/60 rounded-md px-3 py-2 font-semibold text-gray-800"
            />
          </fieldset>
        </div>

        {/* Linha 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Categoria</legend>
            <select
              value={product.category_id}
              onChange={(e) => handleChange("category_id", Number(e.target.value))}
              className="w-full bg-white/60 rounded-md px-3 py-2 text-gray-800"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Link href="/categories" className="text-xs text-red-700 hover:underline mt-1 inline-block">
              Gerenciar categorias
            </Link>
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Marca</legend>
            <input
              type="text"
              value={product.brand ?? ""}
              onChange={(e) => handleChange("brand", e.target.value)}
              className="w-full bg-white/60 rounded-md px-3 py-2 text-gray-800"
            />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Unidade de medida</legend>
            <input
              type="text"
              value={product.unit_of_measure}
              onChange={(e) => handleChange("unit_of_measure", e.target.value)}
              className="w-full bg-white/60 rounded-md px-3 py-2 text-gray-800"
            />
          </fieldset>
        </div>

        {/* Linha 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Estoque
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">QUANTIDADE ATUAL</label>
                <input
                  type="number"
                  value={stock.quantity}
                  onChange={(e) =>
                    setStock({ ...stock, quantity: parseInt(e.target.value, 10) || 0 })
                  }
                  className="bg-[#EDEDED] text-center text-sm rounded-md border border-gray-300 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">MÍNIMO (ALERTA)</label>
                <input
                  type="number"
                  value={stock.min_quantity}
                  onChange={(e) =>
                    setStock({ ...stock, min_quantity: parseInt(e.target.value, 10) || 0 })
                  }
                  className="bg-[#EDEDED] text-center text-sm rounded-md border border-gray-300 py-2"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Valor</legend>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">VALOR DO PRODUTO</label>
              <input
                type="number"
                value={product.price}
                onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
                className="bg-[#EDEDED] text-center text-sm rounded-md border border-gray-300 py-2"
              />
            </div>
          </fieldset>
        </div>

        {/* Linha 4 */}
        <div className="grid grid-cols-1">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Descrição do produto
            </legend>
            <textarea
              value={product.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="resize-none bg-[#EDEDED] w-full h-[110px] p-3 text-sm border border-gray-300 rounded-md focus:outline-none"
            />
          </fieldset>
        </div>

        {/* Botão Editar */}
        <div className="flex justify-center mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-[#A0332C] hover:bg-[#7F2721] text-white px-12 py-2 rounded-md font-semibold text-lg shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving && <Spinner />}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}
