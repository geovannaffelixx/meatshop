"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiGet, apiPatch, apiPost } from "@/shared/lib/api"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"

type Category = { id: number; name: string }

export function NewProductScreen() {
  const router = useRouter()
  const { unitId } = useManagedUnits()

  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    unit_of_measure: "KG",
    brand: "",
    category_id: 0,
    active: true,
    initialQuantity: 0,
  })

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!unitId) return
    apiGet(`/categories?unit_id=${unitId}`)
      .then((cats: Category[]) => {
        setCategories(cats ?? [])
        if (cats?.length > 0) setForm((f) => ({ ...f, category_id: cats[0].id }))
      })
      .catch((err) => setErro(err.message))
  }, [unitId])

  const handleChange = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErro("")
    setOk(false)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.category_id || form.price <= 0) {
      setErro("Preencha pelo menos o nome, categoria e valor do produto.")
      return
    }
    if (!unitId) {
      setErro("Nenhuma unidade selecionada.")
      return
    }

    setSalvando(true)

    try {
      const created = await apiPost("/products", {
        unit_id: unitId,
        name: form.name,
        description: form.description,
        price: form.price,
        unit_of_measure: form.unit_of_measure,
        brand: form.brand || undefined,
        category_id: form.category_id,
        active: form.active,
      })

      if (form.initialQuantity > 0) {
        await apiPatch(`/products/${created.id}/stock`, {
          quantity: form.initialQuantity,
        })
      }

      setOk(true)

      setTimeout(() => {
        router.push("/products")
      }, 1200)
    } catch (error) {
      console.error("Erro ao salvar produto:", error)
      setErro(error instanceof Error ? error.message : "Ocorreu um erro ao salvar o produto.")
    } finally {
      setSalvando(false)
    }
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
              value={form.active ? "ATIVO" : "INATIVO"}
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
              value={form.name}
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
              value={form.category_id}
              onChange={(e) => handleChange("category_id", Number(e.target.value))}
              className="w-full bg-white/60 rounded-md px-3 py-2 text-gray-800"
            >
              {categories.length === 0 && <option value={0}>Nenhuma categoria</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <Link href="/categories" className="text-xs text-red-700 hover:underline mt-1 inline-block">
                Nenhuma categoria ainda — criar uma
              </Link>
            )}
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Marca</legend>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => handleChange("brand", e.target.value)}
              className="w-full bg-white/60 rounded-md px-3 py-2 text-gray-800"
            />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Unidade de medida</legend>
            <input
              type="text"
              value={form.unit_of_measure}
              onChange={(e) => handleChange("unit_of_measure", e.target.value)}
              placeholder="Ex: KG, PCT, UN"
              className="w-full bg-white/60 rounded-md px-3 py-2 text-gray-800"
            />
          </fieldset>
        </div>

        {/* Linha 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2 text-center">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Quantidade inicial em estoque
            </legend>
            <input
              type="number"
              value={form.initialQuantity}
              onChange={(e) => handleChange("initialQuantity", parseInt(e.target.value, 10) || 0)}
              className="bg-[#EDEDED] text-center text-sm rounded-md border border-gray-300 py-2 w-full"
            />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Valor do produto</legend>
            <input
              type="number"
              value={form.price}
              onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
              className="bg-[#EDEDED] text-center text-sm rounded-md border border-gray-300 py-2 w-full"
            />
          </fieldset>
        </div>

        {/* Linha 4 */}
        <div className="grid grid-cols-1">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Descrição do produto
            </legend>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="resize-none bg-[#EDEDED] w-full h-[110px] p-3 text-sm border border-gray-300 rounded-md focus:outline-none"
            />
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
