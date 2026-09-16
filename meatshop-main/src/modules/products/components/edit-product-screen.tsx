"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ImagePlus, X } from "lucide-react"
import { apiGet, apiPatch, apiDelete, API_URL, resolveAssetUrl } from "@/shared/lib/api"
import { Spinner } from "@/shared/components/ui/spinner"
import { toast } from "@/shared/lib/toast"
import { RequiredMark } from "@/shared/components/ui/required-mark"

type Product = {
  id: number
  name: string
  description: string | null
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

type ProductImage = { id: number; image_url: string }

type Category = { id: number; name: string }

export function EditProductScreen() {
  const { id } = useParams()
  const productId = useMemo(() => Number(id), [id])
  const productKey = productId.toString().padStart(5, "0")

  const [product, setProduct] = useState<Product | null>(null)
  const [stock, setStock] = useState<Stock>({ quantity: 0, min_quantity: 0 })
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<ProductImage[]>([])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null)

  useEffect(() => {
    apiGet(`/products/${productId}`)
      .then((res: { product: Product; stock: Stock | null; images?: ProductImage[] }) => {
        setProduct(res.product)
        setStock(res.stock ?? { quantity: 0, min_quantity: 0 })
        setImages(res.images ?? [])
        return apiGet(`/categories?unit_id=${res.product.unit_id}`)
      })
      .then((cats) => setCategories(cats ?? []))
      .catch((err) => setError(err.message))
  }, [productId])

  const handleAddImages = async (files: FileList | null) => {
    if (!files || files.length === 0 || !product) return
    setUploadingImages(true)
    const body = new FormData()
    Array.from(files).forEach((file) => body.append("files", file))
    try {
      const response = await fetch(`${API_URL}/products/${product.id}/images`, {
        method: "POST",
        body,
        credentials: "include",
      })
      if (!response.ok) throw new Error("Não foi possível enviar as fotos.")
      const data = await response.json()
      setImages((prev) => [...prev, ...(data.images ?? [])])
      toast.success("Fotos adicionadas com sucesso.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar as fotos.")
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveImage = async (image: ProductImage) => {
    if (!product) return
    setDeletingImageId(image.id)
    try {
      await apiDelete(`/products/${product.id}/images/${image.id}`)
      setImages((prev) => prev.filter((img) => img.id !== image.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover a foto.")
    } finally {
      setDeletingImageId(null)
    }
  }

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
        description: product.description?.trim() || null,
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

        <h2 className="text-2xl font-bold text-slate-950">
          Editar produto #{productKey}
        </h2>
        <p className="mt-1 mb-6 text-sm text-slate-600">Atualize informações comerciais, estoque e imagens.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <fieldset className="border-2 border-[#A0332C] rounded-md px-3 py-1">
            <legend className="text-[#A0332C] font-semibold px-1 text-sm">Status</legend>
            <select
              value={product.active ? "ATIVO" : "INATIVO"}
              onChange={(e) => handleChange("active", e.target.value === "ATIVO")}
              className="input"
            >
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
          </fieldset>

          <fieldset className="border-2 border-[#A0332C] rounded-md px-3 py-1">
            <legend className="text-[#A0332C] font-semibold px-1 text-sm">Produto<RequiredMark /></legend>
            <input
              type="text"
              value={product.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="input"
              placeholder="Ex.: Picanha bovina"
              required
            />
          </fieldset>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Categoria<RequiredMark /></legend>
            <select
              value={product.category_id}
              onChange={(e) => handleChange("category_id", Number(e.target.value))}
              className="input"
              required
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
              className="input"
              placeholder="Ex.: Friboi"
            />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Unidade de medida<RequiredMark /></legend>
            <select
              value={product.unit_of_measure}
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
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Estoque
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">QUANTIDADE ATUAL</label>
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={stock.quantity}
                  onChange={(e) =>
                    setStock({ ...stock, quantity: Number(e.target.value) || 0 })
                  }
                  className="input"
                  placeholder="Ex.: 25"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">MÍNIMO (ALERTA)</label>
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={stock.min_quantity}
                  onChange={(e) =>
                    setStock({ ...stock, min_quantity: Number(e.target.value) || 0 })
                  }
                  className="input"
                  placeholder="Ex.: 5"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Valor</legend>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">VALOR DO PRODUTO<RequiredMark /></label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={product.price}
                onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
                className="input"
                placeholder="Ex.: 89,90"
                required
              />
            </div>
          </fieldset>
        </div>

        <div className="grid grid-cols-1">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">
              Descrição do produto (opcional)
            </legend>
            <textarea
              value={product.description ?? ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="input h-24 resize-none"
              placeholder="Ex.: Corte bovino macio, ideal para churrasco."
            />
          </fieldset>
        </div>

        <div className="grid grid-cols-1 mt-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Fotos do produto</legend>
            <div className="flex flex-wrap gap-3">
              {images.map((image) => (
                <div key={image.id} className="relative h-20 w-20 overflow-hidden rounded-md border border-gray-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveAssetUrl(image.image_url)} alt="Foto do produto" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(image)}
                    disabled={deletingImageId === image.id}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 disabled:opacity-50"
                    aria-label="Remover foto"
                  >
                    {deletingImageId === image.id ? <Spinner className="text-white" /> : <X size={14} />}
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-400 text-xs text-slate-600 hover:bg-slate-50">
                {uploadingImages ? <Spinner /> : <ImagePlus className="size-5" />}
                {uploadingImages ? "Enviando" : "Adicionar"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploadingImages}
                  className="hidden"
                  onChange={(e) => handleAddImages(e.target.files)}
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
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  )
}
