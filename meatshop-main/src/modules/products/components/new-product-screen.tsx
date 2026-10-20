"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ImagePlus, X } from "lucide-react"
import { apiGet, apiPatch, apiPost, apiUpload } from "@/shared/lib/api"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { Spinner } from "@/shared/components/ui/spinner"
import { toast } from "@/shared/lib/toast"
import { RequiredMark } from "@/shared/components/ui/required-mark"

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
    initialMinimumQuantity: 0,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState(false)

  const [stagedImages, setStagedImages] = useState<File[]>([])
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([])

  useEffect(() => {
    if (!unitId) return
    apiGet(`/categories?unit_id=${unitId}`)
      .then((cats: Category[]) => {
        setCategories(cats ?? [])
        if (cats?.length > 0) setForm((f) => ({ ...f, category_id: cats[0].id }))
      })
      .catch((err) => setError(err.message))
  }, [unitId])

  const handleChange = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setError("")
    setCreated(false)
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
      await apiUpload(`/products/${productId}/images`, body, { silent: true })
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
      setError("Preencha pelo menos o nome, categoria e valor do produto.")
      return
    }
    if (!unitId) {
      setError("Nenhuma unidade selecionada.")
      return
    }

    setSaving(true)

    try {
      const created = await apiPost("/products", {
        unit_id: unitId,
        name: form.name,
        description: form.description.trim() || undefined,
        price: form.price,
        unit_of_measure: form.unit_of_measure,
        brand: form.brand || undefined,
        category_id: form.category_id,
        active: form.active,
      })

      if (form.initialQuantity > 0) {
        await apiPatch(`/products/${created.id}/stock`, {
          quantity: form.initialQuantity,
          min_quantity: form.initialMinimumQuantity,
        })
      }

      await uploadStagedImages(created.id)

      setCreated(true)

      setTimeout(() => {
        router.push("/products")
      }, 1200)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ocorreu um erro ao salvar o produto.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-surface px-4 py-6 sm:px-6">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handleSave()
        }}
        className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <Link href="/products" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700">
          <ArrowLeft className="size-4" />
          Voltar aos produtos
        </Link>

        <h2 className="text-2xl font-bold text-slate-950">
          Novo produto
        </h2>
        <p className="mt-1 mb-6 text-sm text-slate-600">Cadastre informações comerciais, estoque e imagens.</p>

        {error && (
          <div className="mb-3 rounded-md bg-red-100 text-red-700 px-3 py-2 text-sm border border-red-300">
            {error}
          </div>
        )}

        {created && (
          <div className="mb-3 rounded-md bg-green-100 text-green-800 px-3 py-2 text-sm border border-green-300">
            Produto adicionado com sucesso!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
            <legend className="px-1 text-sm font-semibold text-slate-700">Status</legend>
            <select
              value={form.active ? "ATIVO" : "INATIVO"}
              onChange={(e) => handleChange("active", e.target.value === "ATIVO")}
              className="input"
            >
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </fieldset>

          <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
            <legend className="px-1 text-sm font-semibold text-slate-700">Produto<RequiredMark /></legend>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="input"
              placeholder="Ex.: Picanha bovina"
              required
            />
          </fieldset>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Categoria<RequiredMark /></legend>
            <select
              value={form.category_id}
              onChange={(e) => handleChange("category_id", Number(e.target.value))}
              className="input"
              required
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

          <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Marca</legend>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => handleChange("brand", e.target.value)}
              className="input"
              placeholder="Ex.: Friboi"
            />
          </fieldset>

          <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Unidade de medida<RequiredMark /></legend>
            <select
              value={form.unit_of_measure}
              onChange={(e) => handleChange("unit_of_measure", e.target.value)}
              className="input"
              required
            >
              <option value="KG">Quilograma (kg)</option>
              <option value="G">Grama (g)</option>
              <option value="UN">Unidade</option>
              <option value="PCT">Pacote</option>
            </select>
          </fieldset>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Quantidade inicial em estoque
            </legend>
            <input
              type="number"
              value={form.initialQuantity}
              min={0}
              step="0.001"
              onChange={(e) => handleChange("initialQuantity", Number(e.target.value) || 0)}
              className="input"
              placeholder="Ex.: 25"
            />
          </fieldset>

          <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
            <legend className="px-1 text-sm font-medium text-slate-600">Estoque mínimo</legend>
            <input
              type="number"
              min={0}
              step="0.001"
              value={form.initialMinimumQuantity}
              onChange={(e) => handleChange("initialMinimumQuantity", Number(e.target.value) || 0)}
              className="input"
              placeholder="Ex.: 5"
            />
          </fieldset>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
            <legend className="px-1 text-sm font-medium text-slate-600">Preço do produto<RequiredMark /></legend>
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={form.price}
              onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
              className="input"
              placeholder="Ex.: 89,90"
              required
            />
          </fieldset>

          <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Descrição do produto (opcional)
            </legend>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="input h-24 resize-none"
              placeholder="Ex.: Corte bovino macio, ideal para churrasco."
            />
          </fieldset>
        </div>

        <div className="grid grid-cols-1 mt-3">
          <fieldset className="rounded-xl border border-slate-200 px-3 py-3">
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
              <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-400 text-xs text-slate-600 hover:bg-slate-50">
                <ImagePlus className="size-5" />
                Adicionar
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePickImages(e.target.files)}
                />
              </label>
            </div>
          </fieldset>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <Link href="/products" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-700 px-8 py-2 font-semibold text-white shadow-sm hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Spinner />}
            {saving ? "Salvando..." : "Salvar produto"}
          </button>
        </div>
      </form>
    </div>
  )
}
