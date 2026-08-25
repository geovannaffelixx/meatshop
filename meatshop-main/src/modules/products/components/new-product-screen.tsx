"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { X } from "lucide-react"
import { apiGet, apiPatch, apiPost, API_URL } from "@/shared/lib/api"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { Spinner } from "@/shared/components/ui/spinner"
import { toast } from "@/shared/lib/toast"

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

  const [stagedImages, setStagedImages] = useState<File[]>([])
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([])

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

  const handlePickImages = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    setStagedImages((prev) => [...prev, ...list])
    setStagedPreviews((prev) => [...prev, ...list.map((file) => URL.createObjectURL(file))])
  }

  const handleRemoveStagedImage = (index: number) => {
    setStagedPreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    setStagedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadStagedImages = async (productId: number) => {
    if (stagedImages.length === 0) return
    const body = new FormData()
    stagedImages.forEach((file) => body.append("files", file))
    try {
      const response = await fetch(`${API_URL}/products/${productId}/images`, {
        method: "POST",
        body,
        credentials: "include",
      })
      if (!response.ok) throw new Error("Não foi possível enviar as fotos do produto.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Produto criado, mas houve um erro ao enviar as fotos. Você pode adicioná-las na edição do produto.",
      )
    }
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

      await uploadStagedImages(created.id)

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

        {/* Fotos */}
        <div className="grid grid-cols-1 mt-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Fotos do produto</legend>
            <div className="flex flex-wrap gap-3">
              {stagedPreviews.map((src, index) => (
                <div key={src} className="relative h-20 w-20 overflow-hidden rounded-md border border-gray-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveStagedImage(index)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    aria-label="Remover foto"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-400 text-xs text-gray-500 hover:bg-gray-50">
                + Adicionar
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePickImages(e.target.files)}
                />
              </label>
            </div>
          </fieldset>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-center mt-5">
          <button
            onClick={handleSave}
            disabled={salvando}
            className="flex items-center justify-center gap-2 bg-[#A0332C] hover:bg-[#7F2721] text-white px-12 py-2 rounded-md font-semibold text-lg shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {salvando && <Spinner />}
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}
