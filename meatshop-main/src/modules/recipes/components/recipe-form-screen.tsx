"use client"

import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/page-header";
import { toDateInput, isValidDate } from "@/shared/lib/date-time";

import { peekApiData } from "@/shared/lib/query-cache";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Check, Plus, Sparkles, X } from "lucide-react"
import { Spinner } from "@/shared/components/ui/spinner"
import { apiGet, apiPatch, apiPost, apiUpload, resolveAssetUrl } from "@/shared/lib/api"
import { toast } from "@/shared/lib/toast"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { RequiredMark } from "@/shared/components/ui/required-mark"

type StepDraft = { description: string; tip: string }
type IngredientDraft = { name: string; quantity: string; tip: string }
type ProductDraft = { product_id: number; call_to_action: string }
type Product = { id: number; name: string }
type AiRecipeDraft = {
  title: string
  description: string
  tag: string
  safety_notice: string
  ingredients: { name: string; quantity: string; tip: string | null }[]
  steps: { step_number: number; description: string; tip: string | null }[]
  products: ProductDraft[]
}

type RecipeDetail = {
  id: number
  unit_id: number
  title: string
  description: string | null
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



const fieldClass = "input"

export function RecipeFormScreen({ recipeId }: { recipeId?: number }) {
  const router = useRouter()
  const { unitId } = useManagedUnits()
  const isEditing = recipeId !== undefined
  const cachedRecipe = recipeId ? peekApiData<RecipeDetail>(`/recipes/${recipeId}`) : undefined

  const [products, setProducts] = useState<Product[]>(() => unitId ? peekApiData<{ data: Product[] }>(`/products/manage?unit_id=${unitId}&limit=200`)?.data ?? [] : [])
  const [loadingRecipe, setLoadingRecipe] = useState(isEditing && !cachedRecipe)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(cachedRecipe?.title ?? "")
  const [description, setDescription] = useState(cachedRecipe?.description ?? "")
  const [tag, setTag] = useState(cachedRecipe?.tag ?? "")
  const [videoUrl, setVideoUrl] = useState(cachedRecipe?.video_url ?? "")
  const [active, setActive] = useState(cachedRecipe?.active ?? true)
  const [weekStart, setWeekStart] = useState(toDateInput(cachedRecipe?.week_start ?? null))
  const [steps, setSteps] = useState<StepDraft[]>(() => cachedRecipe?.steps.length ? [...cachedRecipe.steps].sort((a,b) => a.step_number - b.step_number).map(step => ({ description: step.description, tip: step.tip ?? "" })) : [{ ...EMPTY_STEP }])
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(() => cachedRecipe?.ingredients.length ? cachedRecipe.ingredients.map(item => ({ name: item.name, quantity: item.quantity, tip: item.tip ?? "" })) : [{ ...EMPTY_INGREDIENT }])
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>(() => cachedRecipe?.products ?? [])
  const [aiBrief, setAiBrief] = useState("")
  const [aiServings, setAiServings] = useState(4)
  const [aiProductIds, setAiProductIds] = useState<number[]>([])
  const [aiDraft, setAiDraft] = useState<AiRecipeDraft | null>(null)
  const [aiDraftRequestId, setAiDraftRequestId] = useState<string | null>(null)
  const [generatingDraft, setGeneratingDraft] = useState(false)

  const [imageUrl, setImageUrl] = useState<string | null>(cachedRecipe?.image_url ?? null)
  const [stagedImage, setStagedImage] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (!unitId) return
    apiGet(`/products/manage?unit_id=${unitId}&limit=200`)
      .then((res) => setProducts(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
  }, [unitId])

  useEffect(() => {
    if (!isEditing) return
    apiGet(`/recipes/${recipeId}`)
      .then((recipe: RecipeDetail) => {
        setTitle(recipe.title)
        setDescription(recipe.description ?? "")
        setTag(recipe.tag ?? "")
        setVideoUrl(recipe.video_url ?? "")
        setActive(recipe.active)
        setWeekStart(toDateInput(recipe.week_start))
        setImageUrl(recipe.image_url)
        setSteps(
          recipe.steps.length
            ? [...recipe.steps]
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

  const generateAiDraft = async () => {
    if (!unitId) {
      setError("Selecione uma unidade antes de gerar o rascunho.")
      return
    }
    if (aiBrief.trim().length < 3) {
      setError("Descreva em poucas palavras a receita que deseja criar.")
      return
    }
    setGeneratingDraft(true)
    setError(null)
    try {
      const response = await apiPost(
        "/ai/recipe-drafts",
        {
          unit_id: unitId,
          brief: aiBrief.trim(),
          servings: aiServings,
          tag: tag.trim() || undefined,
          product_ids: aiProductIds,
        },
        { silent: true },
      )
      setAiDraft(response.draft as AiRecipeDraft)
      setAiDraftRequestId(typeof response.request_id === "string" ? response.request_id : null)
      toast.success("Rascunho gerado. Revise antes de aplicar.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o rascunho.")
    } finally {
      setGeneratingDraft(false)
    }
  }

  const applyAiDraft = () => {
    if (!aiDraft) return
    setTitle(aiDraft.title)
    setDescription(aiDraft.description)
    setTag(aiDraft.tag)
    setIngredients(aiDraft.ingredients.map((item) => ({ ...item, tip: item.tip ?? "" })))
    setSteps(
      [...aiDraft.steps]
        .sort((a, b) => a.step_number - b.step_number)
        .map((item) => ({ description: item.description, tip: item.tip ?? "" })),
    )
    setProductDrafts(aiDraft.products)
    recordAiDraftFeedback("APPLIED")
    setAiDraft(null)
    setAiDraftRequestId(null)
    toast.success("Rascunho aplicado ao formulário. Revise e salve quando estiver pronto.")
  }

  const recordAiDraftFeedback = (action: "APPLIED" | "DISCARDED") => {
    if (!unitId || !aiDraftRequestId) return
    void apiPost(
      "/ai/recipe-drafts/feedback",
      { unit_id: unitId, request_id: aiDraftRequestId, action },
      { silent: true },
    ).catch(() => {})
  }

  const discardAiDraft = () => {
    recordAiDraftFeedback("DISCARDED")
    setAiDraft(null)
    setAiDraftRequestId(null)
  }

  const uploadImageIfNeeded = async (targetId: number) => {
    if (!stagedImage) return
    setUploadingImage(true)
    const body = new FormData()
    body.append("file", stagedImage)
    try {
      await apiUpload(`/recipes/${targetId}/image`, body, { silent: true })
    } catch {
      toast.error("Não foi possível enviar a foto de capa.")
    } finally {
      setUploadingImage(false)
    }
  }

  const validate = (): string | null => {
    if (weekStart && !isValidDate(weekStart)) return "Informe uma data válida para a semana.";
    if (!title.trim()) return "Informe o título da receita."
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
        description: description.trim() || undefined,
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
      <div className="page-surface"><div className="page-container max-w-5xl"><DataSkeleton variant="form" label="Carregando receita..." /></div></div>
    )
  }

  const coverSrc = stagedPreview ?? (imageUrl ? resolveAssetUrl(imageUrl) : null)

  return (
    <div className="page-surface">
      <div className="page-container max-w-5xl">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handleSave()
        }}
        className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <Link href="/recipes" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700">
          <ArrowLeft className="size-4" />
          Voltar às receitas
        </Link>

        <div className="mb-6"><PageHeader title={isEditing ? "Editar receita" : "Nova receita"} description="Organize a capa, os ingredientes e o modo de preparo." /></div>

        {error && (
          <div className="mb-3 rounded-md bg-red-100 text-red-700 px-3 py-2 text-sm border border-red-300">
            {error}
          </div>
        )}

        <section className="mb-5 rounded-xl border border-violet-200 bg-violet-50/70 p-4" aria-labelledby="ai-draft-title">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-violet-700 p-2 text-white"><Sparkles className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <h3 id="ai-draft-title" className="font-bold text-slate-950">Rascunho com IA</h3>
              <p className="mt-1 text-sm text-slate-600">
                A IA preenche uma sugestão para revisão. Ela nunca salva ou publica automaticamente.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_8rem]">
            <label className="text-sm font-semibold text-slate-700">
              O que deseja preparar?
              <textarea
                value={aiBrief}
                onChange={(event) => setAiBrief(event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Ex.: receita rápida de picanha com ervas para almoço em família"
                className={`${fieldClass} mt-1 resize-y font-normal`}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Porções
              <input
                type="number"
                min={1}
                max={100}
                value={aiServings}
                onChange={(event) => setAiServings(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                className={`${fieldClass} mt-1 font-normal`}
              />
            </label>
          </div>
          {products.length > 0 && (
            <fieldset className="mt-3">
              <legend className="text-sm font-semibold text-slate-700">Produtos que a IA pode associar</legend>
              <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-auto">
                {products.map((product) => {
                  const selected = aiProductIds.includes(product.id)
                  return (
                    <label key={product.id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${selected ? "border-violet-700 bg-violet-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected}
                        onChange={() => setAiProductIds((current) => selected ? current.filter((id) => id !== product.id) : [...current, product.id])}
                      />
                      {product.name}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}
          <button
            type="button"
            onClick={() => void generateAiDraft()}
            disabled={generatingDraft}
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
          >
            {generatingDraft ? <Spinner /> : <Sparkles className="size-4" />}
            {generatingDraft ? "Gerando..." : "Gerar rascunho"}
          </button>

          {aiDraft && (
            <div className="mt-4 rounded-lg border border-violet-300 bg-white p-4" role="status">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Prévia para revisão</p>
                  <h4 className="mt-1 text-lg font-bold text-slate-950">{aiDraft.title}</h4>
                  <p className="mt-1 text-sm text-slate-600">{aiDraft.description}</p>
                  <p className="mt-2 text-xs text-amber-800"><strong>Segurança:</strong> {aiDraft.safety_notice}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {aiDraft.ingredients.length} ingredientes · {aiDraft.steps.length} passos · {aiDraft.products.length} produtos associados
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={discardAiDraft} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Descartar</button>
                  <button type="button" onClick={applyAiDraft} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800"><Check className="size-4" />Aplicar</button>
                </div>
              </div>
            </div>
          )}
        </section>

        <fieldset className="border border-gray-400 rounded-md px-3 py-2 mb-3">
          <legend className="text-gray-600 font-medium px-1 text-sm">Foto de capa</legend>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md bg-gray-200">
              {coverSrc ? (
                <Image
                  src={coverSrc}
                  alt="Capa da receita"
                  width={96}
                  height={96}
                  unoptimized
                  className="h-full w-full object-cover"
                />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <fieldset className="border border-gray-400 rounded-md px-3 py-2 md:col-span-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Título<RequiredMark /></legend>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} placeholder="Ex.: Picanha assada com ervas" required />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Tag / categoria</legend>
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex.: Bovino, Suíno ou Aves" className={fieldClass} />
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
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={fieldClass} />
          </fieldset>

          <fieldset className="border border-gray-400 rounded-md px-3 py-2 md:col-span-2">
            <legend className="text-gray-600 font-medium px-1 text-sm">Descrição (opcional)</legend>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none bg-white/60 w-full h-[80px] p-3 text-sm border border-gray-300 rounded-md focus:outline-none"
              placeholder="Ex.: Uma receita prática para o almoço de domingo."
            />
          </fieldset>
        </div>

        <fieldset className="border border-gray-400 rounded-md px-3 py-2 mb-3">
          <legend className="text-gray-600 font-medium px-1 text-sm">Ingredientes<RequiredMark /></legend>
          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={ingredient.name}
                  onChange={(e) => setIngredients((prev) => prev.map((it, i) => (i === index ? { ...it, name: e.target.value } : it)))}
                  placeholder="Ex.: Picanha"
                  required
                  className={`${fieldClass} col-span-5`}
                />
                <input
                  value={ingredient.quantity}
                  onChange={(e) => setIngredients((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: e.target.value } : it)))}
                  placeholder="Ex.: 1 kg"
                  required
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

        <fieldset className="border border-gray-400 rounded-md px-3 py-2 mb-3">
          <legend className="text-gray-600 font-medium px-1 text-sm">Modo de preparo<RequiredMark /></legend>
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
                    required
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

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <Button asChild variant="outline"><Link href="/recipes">Cancelar</Link></Button>
          <Button type="submit" disabled={saving} className="px-8">
            {saving && <Spinner />}
            {saving ? "Salvando..." : "Salvar receita"}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
}
