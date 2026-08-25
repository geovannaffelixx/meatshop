"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Spinner } from "@/shared/components/ui/spinner"
import { apiGet, apiPatch, apiPost, API_URL } from "@/shared/lib/api"
import { toast } from "@/shared/lib/toast"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"

type StepDraft = { description: string; tip: string }
type IngredientDraft = { name: string; quantity: string; tip: string }
type ProductDraft = { product_id: number; call_to_action: string }
type Product = { id: number; name: string }

type RecipeDetail = {
  id: number
  unit_id: number
  title: string
  description: string
  image_url: string | null
  video_url: string | null
  tag: string | null
  active: boolean
  week_start: string | null
  steps: { step_number: number; description: string; tip: string | null }[]
  ingredients: { name: string; quantity: string; tip: string | null }[]
  products: { product_id: number; call_to_action: string }[]
}

const EMPTY_STEP: StepDraft = { description: "", tip: "" }
const EMPTY_INGREDIENT: IngredientDraft = { name: "", quantity: "", tip: "" }

function toDateInput(iso: string | null) {
  if (!iso) return ""
  return iso.slice(0, 10)
}

const fieldClass = "w-full bg-white/60 rounded-md px-3 py-2 text-gray-800 border border-gray-300"

export function RecipeFormScreen({ recipeId }: { recipeId?: number }) {
  const router = useRouter()
  const { unitId } = useManagedUnits()
  const isEditing = recipeId !== undefined

  const [products, setProducts] = useState<Product[]>([])
  const [loadingRecipe, setLoadingRecipe] = useState(isEditing)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tag, setTag] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [active, setActive] = useState(true)
  const [weekStart, setWeekStart] = useState("")
  const [steps, setSteps] = useState<StepDraft[]>([{ ...EMPTY_STEP }])
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([{ ...EMPTY_INGREDIENT }])
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>([])

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [stagedImage, setStagedImage] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (!unitId) return
    apiGet(`/products?unit_id=${unitId}&limit=200`)
      .then((res) => setProducts(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
  }, [unitId])

  useEffect(() => {
    if (!isEditing) return
    apiGet(`/recipes/${recipeId}`)
      .then((recipe: RecipeDetail) => {
        setTitle(recipe.title)
        setDescription(recipe.description)
        setTag(recipe.tag ?? "")
        setVideoUrl(recipe.video_url ?? "")
        setActive(recipe.active)
        setWeekStart(toDateInput(recipe.week_start))
        setImageUrl(recipe.image_url)
        setSteps(
          recipe.steps.length
            ? recipe.steps
                .sort((a, b) => a.step_number - b.step_number)
                .map((s) => ({ description: s.description, tip: s.tip ?? "" }))
            : [{ ...EMPTY_STEP }],
        )
        setIngredients(
          recipe.ingredients.length
            ? recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, tip: i.tip ?? "" }))
            : [{ ...EMPTY_INGREDIENT }],
        )
        setProductDrafts(recipe.products.map((p) => ({ product_id: p.product_id, call_to_action: p.call_to_action })))
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar receita."))
      .finally(() => setLoadingRecipe(false))
  }, [isEditing, recipeId])

  const handlePickImage = (file: File | undefined) => {
    if (!file) return
    setStagedImage(file)
    setStagedPreview(URL.createObjectURL(file))
  }

  const uploadImageIfNeeded = async (targetId: number) => {
    if (!stagedImage) return
    setUploadingImage(true)
    const body = new FormData()
    body.append("file", stagedImage)
    try {
      const response = await fetch(`${API_URL}/recipes/${targetId}/image`, {
        method: "POST",
        body,
        credentials: "include",
      })
      if (!response.ok) throw new Error("Não foi possível enviar a foto de capa.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a foto de capa.")
    } finally {
      setUploadingImage(false)
    }
  }

  const validate = (): string | null => {
    if (!title.trim()) return "Informe o título da receita."
    if (!description.trim()) return "Informe a descrição da receita."
    if (steps.some((s) => !s.description.trim())) return "Preencha todos os passos do modo de preparo, ou remova os vazios."
    if (ingredients.some((i) => !i.name.trim() || !i.quantity.trim())) return "Preencha nome e quantidade de todos os ingredientes, ou remova os vazios."
    if (productDrafts.some((p) => !p.product_id || !p.call_to_action.trim())) return "Preencha o produto e a chamada de cada produto em destaque, ou remova os vazios."
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    if (!unitId) {
      setError("Nenhuma unidade selecionada.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        tag: tag.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        active,
        week_start: weekStart || undefined,
        steps: steps.map((s, index) => ({
          step_number: index + 1,
          description: s.description.trim(),
          tip: s.tip.trim() || undefined,
        })),
        ingredients: ingredients.map((i) => ({
          name: i.name.trim(),
          quantity: i.quantity.trim(),
          tip: i.tip.trim() || undefined,
        })),
        products: productDrafts.map((p) => ({
          product_id: p.product_id,
          call_to_action: p.call_to_action.trim(),
        })),
      }

      if (isEditing) {
        await apiPatch(`/recipes/${recipeId}`, payload)
        await uploadImageIfNeeded(recipeId)
        toast.success("Receita atualizada com sucesso.")
      } else {
        const created = await apiPost("/recipes", { ...payload, unit_id: unitId })
        await uploadImageIfNeeded(created.id)
        toast.success("Receita criada com sucesso.")
      }

      router.push("/recipes")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar receita.")
    } finally {
      setSaving(false)
    }
  }

  if (loadingRecipe) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 text-lg">
        Carregando receita...
      </div>
    )
  }

  const coverSrc = stagedPreview ?? (imageUrl ? `${API_URL}${imageUrl}` : null)

  return (
    <div className="min-h-screen bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat flex items-start justify-center py-8">
      <div className="relative w-[860px] max-w-[96vw] bg-[#D9D9D9] rounded-xl shadow-lg p-5 border border-gray-400">
        <button
          onClick={() => router.back()}
          className="absolute top-3 right-4 text-red-700 font-bold text-2xl hover:scale-110 transition-transform"
        >
          ✕
        </button>

        <h2 className="text-center text-2xl font-extrabold text-red-700 mb-4">
          {isEditing ? "Editar Receita" : "Nova Receita"}
        </h2>

        {error && (
          <div className="mb-3 rounded-md bg-red-100 text-red-700 px-3 py-2 text-sm border border-red-300">
            {error}
          </div>
        )}

        {/* Capa */}
        <fieldset className="border border-gray-400 rounded-md px-3 py-2 mb-3">
          <legend className="text-gray-600 font-medium px-1 text-sm">Foto de capa</legend>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md bg-gray-200">
              {coverSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverSrc} alt="Capa da receita" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-gray-500">Sem foto</span>
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-gray-50 bg-white">
              {uploadingImage && <Spinner />}
              {uploadingImage ? "Enviando..." : "Selecionar foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingImage}
                onChange={(e) => handlePickImage(e.target.files?.[0])}
              />
            </label>
          </div>
        </fieldset>

        {/* Dados básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2 md:col-span-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Título</legend>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Tag / categoria</legend>
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex: Bovino, Suíno, Aves" className={fieldClass} />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Status</legend>
            <select value={active ? "ATIVA" : "INATIVA"} onChange={(e) => setActive(e.target.value === "ATIVA")} className={fieldClass}>
              <option value="ATIVA">Ativa</option>
              <option value="INATIVA">Inativa</option>
            </select>
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Destacar como &quot;receita da semana&quot; a partir de</legend>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={fieldClass} />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Vídeo (link do YouTube, opcional)</legend>
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className={fieldClass} />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2 md:col-span-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Descrição</legend>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none bg-white/60 w-full h-[80px] p-3 text-sm border border-gray-300 rounded-md focus:outline-none"
            />
          </fieldset>
        </div>

        {/* Ingredientes */}
        <fieldset className="border border-gray-400 rounded-md px-3 py-2 mb-3">
          <legend className="text-gray-600 font-medium px-1 text-sm">Ingredientes</legend>
          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={ingredient.name}
                  onChange={(e) => setIngredients((prev) => prev.map((it, i) => (i === index ? { ...it, name: e.target.value } : it)))}
                  placeholder="Ingrediente"
                  className={`${fieldClass} col-span-5`}
                />
                <input
                  value={ingredient.quantity}
                  onChange={(e) => setIngredients((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: e.target.value } : it)))}
                  placeholder="Quantidade"
                  className={`${fieldClass} col-span-2`}
                />
                <input
                  value={ingredient.tip}
                  onChange={(e) => setIngredients((prev) => prev.map((it, i) => (i === index ? { ...it, tip: e.target.value } : it)))}
                  placeholder="Dica (opcional)"
                  className={`${fieldClass} col-span-4`}
                />
                <button
                  type="button"
                  onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== index))}
                  disabled={ingredients.length === 1}
                  className="col-span-1 flex justify-center text-gray-500 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remover ingrediente"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIngredients((prev) => [...prev, { ...EMPTY_INGREDIENT }])}
            className="mt-2 flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline"
          >
            <Plus size={14} /> Adicionar ingrediente
          </button>
        </fieldset>

        {/* Modo de preparo */}
        <fieldset className="border border-gray-400 rounded-md px-3 py-2 mb-3">
          <legend className="text-gray-600 font-medium px-1 text-sm">Modo de preparo</legend>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="mt-2 w-6 shrink-0 text-center text-sm font-bold text-gray-500">{index + 1}.</span>
                <div className="flex-1 space-y-1">
                  <textarea
                    value={step.description}
                    onChange={(e) => setSteps((prev) => prev.map((it, i) => (i === index ? { ...it, description: e.target.value } : it)))}
                    placeholder="Descreva o passo"
                    rows={2}
                    className="resize-none w-full bg-white/60 rounded-md px-3 py-2 text-sm border border-gray-300 focus:outline-none"
                  />
                  <input
                    value={step.tip}
                    onChange={(e) => setSteps((prev) => prev.map((it, i) => (i === index ? { ...it, tip: e.target.value } : it)))}
                    placeholder="Dica extra (opcional)"
                    className={fieldClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                  disabled={steps.length === 1}
                  className="mt-2 flex justify-center text-gray-500 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remover passo"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSteps((prev) => [...prev, { ...EMPTY_STEP }])}
            className="mt-2 flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline"
          >
            <Plus size={14} /> Adicionar passo
          </button>
        </fieldset>

        {/* Produtos em destaque */}
        <fieldset className="border border-gray-400 rounded-md px-3 py-2 mb-3">
          <legend className="text-gray-600 font-medium px-1 text-sm">Produtos em destaque (opcional)</legend>
          <div className="space-y-2">
            {productDrafts.map((draft, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <select
                  value={draft.product_id}
                  onChange={(e) => setProductDrafts((prev) => prev.map((it, i) => (i === index ? { ...it, product_id: Number(e.target.value) } : it)))}
                  className={`${fieldClass} col-span-4`}
                >
                  <option value={0}>Selecione um produto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  value={draft.call_to_action}
                  onChange={(e) => setProductDrafts((prev) => prev.map((it, i) => (i === index ? { ...it, call_to_action: e.target.value } : it)))}
                  placeholder="Chamada, ex: Use nossa picanha nobre nessa receita!"
                  className={`${fieldClass} col-span-7`}
                />
                <button
                  type="button"
                  onClick={() => setProductDrafts((prev) => prev.filter((_, i) => i !== index))}
                  className="col-span-1 flex justify-center text-gray-500 hover:text-red-600"
                  aria-label="Remover produto"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setProductDrafts((prev) => [...prev, { product_id: 0, call_to_action: "" }])}
            className="mt-2 flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline"
          >
            <Plus size={14} /> Adicionar produto em destaque
          </button>
        </fieldset>

        {/* Botão Salvar */}
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
