"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Spinner } from "@/shared/components/ui/spinner"
import { Plus } from "lucide-react"
import { apiGet, apiPatch, apiPost } from "@/shared/lib/api"
import { toast } from "@/shared/lib/toast"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"

type Product = { id: number; name: string; active: boolean }

type Promotion = {
  id: number
  unit_id: number
  product_id: number
  title: string
  description: string | null
  discount_percentage: string | number | null
  promotional_price: string | number | null
  starts_at: string
  ends_at: string
  active: boolean
}

type DiscountMode = "percentage" | "price"

type FormState = {
  product_id: number
  title: string
  description: string
  discountMode: DiscountMode
  discount_percentage: string
  promotional_price: string
  starts_at: string
  ends_at: string
}

const EMPTY_FORM: FormState = {
  product_id: 0,
  title: "",
  description: "",
  discountMode: "percentage",
  discount_percentage: "",
  promotional_price: "",
  starts_at: "",
  ends_at: "",
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTimeBR(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

function promotionStatus(promotion: Promotion) {
  if (!promotion.active) return { label: "Inativa", className: "text-gray-500" }
  const now = new Date()
  if (now < new Date(promotion.starts_at)) return { label: "Agendada", className: "text-blue-600" }
  if (now > new Date(promotion.ends_at)) return { label: "Expirada", className: "text-amber-600" }
  return { label: "Ativa", className: "text-green-700" }
}

export function PromotionsScreen() {
  const { units, unitId, setUnitId, loading: unitsLoading } = useManagedUnits()

  const [products, setProducts] = useState<Product[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const productName = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.name]))
    return (id: number) => map.get(id) ?? `Produto #${id}`
  }, [products])

  const loadData = async (unit: number) => {
    setLoading(true)
    setError(null)
    try {
      const [promotionsData, productsData] = await Promise.all([
        apiGet(`/promotions?unit_id=${unit}`),
        apiGet(`/products?unit_id=${unit}&limit=200`),
      ])
      setPromotions(Array.isArray(promotionsData) ? promotionsData : [])
      setProducts(Array.isArray(productsData?.data) ? productsData.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar promoções.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!unitId) return
    loadData(unitId)
  }, [unitId])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, product_id: products[0]?.id ?? 0 })
    setFormError(null)
    setOpen(true)
  }

  const openEdit = (promotion: Promotion) => {
    setEditingId(promotion.id)
    setForm({
      product_id: promotion.product_id,
      title: promotion.title,
      description: promotion.description ?? "",
      discountMode: promotion.promotional_price != null ? "price" : "percentage",
      discount_percentage: promotion.discount_percentage != null ? String(promotion.discount_percentage) : "",
      promotional_price: promotion.promotional_price != null ? String(promotion.promotional_price) : "",
      starts_at: toDatetimeLocal(promotion.starts_at),
      ends_at: toDatetimeLocal(promotion.ends_at),
    })
    setFormError(null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.product_id) {
      setFormError("Selecione o produto em promoção.")
      return
    }
    if (!form.title.trim()) {
      setFormError("Informe o título da promoção.")
      return
    }
    if (form.discountMode === "percentage" && !form.discount_percentage) {
      setFormError("Informe o percentual de desconto.")
      return
    }
    if (form.discountMode === "price" && !form.promotional_price) {
      setFormError("Informe o preço promocional.")
      return
    }
    if (!form.starts_at || !form.ends_at) {
      setFormError("Informe o período da promoção.")
      return
    }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      setFormError("A data de término deve ser depois da data de início.")
      return
    }
    if (!unitId) {
      setFormError("Nenhuma unidade selecionada.")
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      // Ao editar, o campo do modo de desconto não escolhido precisa ir como null (não
      // omitido) para limpar de fato um valor antigo caso o usuário troque de percentual
      // para preço fixo ou vice-versa. Na criação, undefined é o correto (DTO exige
      // exatamente um dos dois via ValidateIf, que checa "=== undefined").
      const clearValue = editingId ? null : undefined
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        discount_percentage: form.discountMode === "percentage" ? Number(form.discount_percentage) : clearValue,
        promotional_price: form.discountMode === "price" ? Number(form.promotional_price) : clearValue,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      }

      if (editingId) {
        await apiPatch(`/promotions/${editingId}`, payload)
      } else {
        await apiPost("/promotions", { ...payload, unit_id: unitId, product_id: form.product_id })
      }

      setOpen(false)
      await loadData(unitId)
      toast.success(editingId ? "Promoção atualizada com sucesso." : "Promoção criada com sucesso.")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar promoção.")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (promotion: Promotion) => {
    if (!unitId || togglingId) return
    setTogglingId(promotion.id)
    try {
      await apiPatch(`/promotions/${promotion.id}/${promotion.active ? "deactivate" : "activate"}`, {})
      await loadData(unitId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar promoção.")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-3xl font-bold text-red-700">Promoções</h2>

          <div className="flex items-center gap-3">
            {units.length > 1 && (
              <select
                value={unitId ?? ""}
                onChange={(e) => setUnitId(Number(e.target.value))}
                className="border rounded-md px-3 py-2"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={openCreate}
                  disabled={products.length === 0}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                >
                  <Plus size={18} />
                  Nova promoção
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-50 border border-gray-300 rounded-2xl shadow-2xl max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-red-700">
                    {editingId ? "Editar promoção" : "Nova promoção"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Produto</label>
                    <select
                      value={form.product_id}
                      disabled={!!editingId}
                      onChange={(e) => setForm((f) => ({ ...f, product_id: Number(e.target.value) }))}
                      className="mt-1 w-full border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value={0}>Selecione um produto</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Título</label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ex.: Picanha em promoção"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Descrição</label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de desconto</label>
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={form.discountMode === "percentage"}
                          onChange={() => setForm((f) => ({ ...f, discountMode: "percentage" }))}
                        />
                        Percentual (%)
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={form.discountMode === "price"}
                          onChange={() => setForm((f) => ({ ...f, discountMode: "price" }))}
                        />
                        Preço promocional (R$)
                      </label>
                    </div>
                  </div>

                  {form.discountMode === "percentage" ? (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Desconto (%)</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={form.discount_percentage}
                        onChange={(e) => setForm((f) => ({ ...f, discount_percentage: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Preço promocional (R$)</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.promotional_price}
                        onChange={(e) => setForm((f) => ({ ...f, promotional_price: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Início</label>
                      <Input
                        type="datetime-local"
                        value={form.starts_at}
                        onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Término</label>
                      <Input
                        type="datetime-local"
                        value={form.ends_at}
                        onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                      />
                    </div>
                  </div>

                  {formError && <p className="text-sm text-red-600">{formError}</p>}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      disabled={saving}
                      onClick={handleSave}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {saving && <Spinner />}
                      {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar promoção"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!unitsLoading && units.length === 0 && (
          <div className="text-center text-red-600">Nenhuma unidade encontrada para este usuário.</div>
        )}

        {!loading && unitId && products.length === 0 && (
          <div className="text-center text-amber-600">
            Esta unidade ainda não tem produtos cadastrados — cadastre um produto antes de criar uma promoção.
          </div>
        )}

        <Card className="bg-white/70 backdrop-blur-md shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-gray-500 italic">Carregando promoções...</div>
            ) : error ? (
              <div className="p-4 text-red-600 font-semibold">Erro: {error}</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-semibold">
                  <tr>
                    <th className="p-3">Título</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Desconto</th>
                    <th className="p-3">Período</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.length > 0 ? (
                    promotions.map((promotion) => {
                      const status = promotionStatus(promotion)
                      return (
                        <tr key={promotion.id} className="border-t hover:bg-gray-50">
                          <td className="p-3 font-medium">{promotion.title}</td>
                          <td className="p-3 text-gray-600">{productName(promotion.product_id)}</td>
                          <td className="p-3">
                            {promotion.promotional_price != null
                              ? Number(promotion.promotional_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                              : `${promotion.discount_percentage}%`}
                          </td>
                          <td className="p-3 text-gray-600">
                            {formatDateTimeBR(promotion.starts_at)} — {formatDateTimeBR(promotion.ends_at)}
                          </td>
                          <td className={`p-3 font-semibold ${status.className}`}>{status.label}</td>
                          <td className="p-3 text-center space-x-3">
                            <button
                              onClick={() => openEdit(promotion)}
                              className="text-red-600 font-semibold hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => toggleActive(promotion)}
                              disabled={togglingId === promotion.id}
                              className="text-gray-600 font-semibold hover:underline disabled:opacity-50"
                            >
                              {togglingId === promotion.id ? "Atualizando..." : promotion.active ? "Desativar" : "Ativar"}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center p-6 text-gray-500 italic">
                        Nenhuma promoção cadastrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
