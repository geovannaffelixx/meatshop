"use client"

import { toDatetimeLocal, datetimeLocalToISO, validateDateRange } from "@/shared/lib/date-time";
import { formatDateTime as formatDateTimeBR } from "@/shared/lib/formatters";

import { ReusableTable, type TableColumn } from "@/shared/components/reusable-table";
import { DataPagination } from "@/shared/components/data-pagination";
import { useTablePagination } from "@/shared/hooks/use-table-pagination";

import { useApiQuery } from "@/shared/hooks/use-api-query";



import { useMemo, useState } from "react"
import { Button } from "@/shared/components/ui/button"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { RequiredMark } from "@/shared/components/ui/required-mark"
import { Spinner } from "@/shared/components/ui/spinner"
import { Plus } from "lucide-react"
import { apiPatch, apiPost } from "@/shared/lib/api"
import { toast } from "@/shared/lib/toast"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { SearchField } from "@/shared/components/search-field";
import { PageHeader } from "@/shared/components/page-header"

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





function promotionStatus(promotion: Promotion) {
  if (!promotion.active) return { label: "Inativa", className: "text-gray-500" }
  const now = new Date()
  if (now < new Date(promotion.starts_at)) return { label: "Agendada", className: "text-blue-600" }
  if (now > new Date(promotion.ends_at)) return { label: "Expirada", className: "text-amber-600" }
  return { label: "Ativa", className: "text-green-700" }
}

export function PromotionsScreen() {
  const { units, unitId, loading: unitsLoading } = useManagedUnits()

  const promotionsQuery = useApiQuery<Promotion[]>(unitId ? `/promotions?unit_id=${unitId}` : null);
  const productsQuery = useApiQuery<{ data: Product[] }>(unitId ? `/products/manage?unit_id=${unitId}&limit=200` : null);
  const promotions = useMemo(() => promotionsQuery.data ?? [], [promotionsQuery.data]);
  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);
  const loading = promotionsQuery.isPending || productsQuery.isPending;
  const error = promotionsQuery.error?.message ?? productsQuery.error?.message;

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const productName = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.name]))
    return (id: number) => map.get(id) ?? `Produto #${id}`
  }, [products])

  const filteredPromotions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    return promotions.filter((promotion) => {
      const status = promotionStatus(promotion).label
      const searchMatches =
        !term ||
        `${promotion.title} ${productName(promotion.product_id)}`
          .toLocaleLowerCase("pt-BR")
          .includes(term)
      const statusMatches = !statusFilter || status === statusFilter
      return searchMatches && statusMatches
    })
  }, [productName, promotions, search, statusFilter])

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
    if (!validateDateRange(form.starts_at, form.ends_at)) {
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
      const clearValue = editingId ? null : undefined
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        discount_percentage: form.discountMode === "percentage" ? Number(form.discount_percentage) : clearValue,
        promotional_price: form.discountMode === "price" ? Number(form.promotional_price) : clearValue,
        starts_at: datetimeLocalToISO(form.starts_at),
        ends_at: datetimeLocalToISO(form.ends_at),
      }

      if (editingId) {
        await apiPatch(`/promotions/${editingId}`, payload)
      } else {
        await apiPost("/promotions", { ...payload, unit_id: unitId, product_id: form.product_id })
      }

      setOpen(false)
      await Promise.all([promotionsQuery.refetch(), productsQuery.refetch()])
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
      await Promise.all([promotionsQuery.refetch(), productsQuery.refetch()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar promoção.")
    } finally {
      setTogglingId(null)
    }
  }

  const pagination = useTablePagination(filteredPromotions, `${unitId}:${search}:${statusFilter}`);
  const columns: TableColumn<Promotion>[] = [
    { id: 'title', header: 'Título', accessor: 'title', className: 'font-medium' },
    { id: 'product', header: 'Produto', accessor: row => productName(row.product_id) },
    { id: 'discount', header: 'Desconto', accessor: row => row.promotional_price != null ? Number(row.promotional_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : `${row.discount_percentage}%` },
    { id: 'period', header: 'Período', accessor: row => <>{formatDateTimeBR(row.starts_at)} — {formatDateTimeBR(row.ends_at)}</> },
    { id: 'status', header: 'Status', accessor: row => { const status = promotionStatus(row); return <span className={`font-semibold ${status.className}`}>{status.label}</span>; } },
    { id: 'actions', header: 'Ações', textAlign: 'end', accessor: row => <div className="flex justify-end gap-3">
      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>Editar</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => void toggleActive(row)} disabled={togglingId === row.id}>{togglingId === row.id ? 'Atualizando...' : row.active ? 'Desativar' : 'Ativar'}</Button>
    </div> },
  ];

  return (
    <div className="page-surface">
      <div className="page-container">
        <PageHeader
          eyebrow="Marketing"
          title="Promoções"
          description="Planeje campanhas por produto, período e tipo de desconto."
          actions={
            <>


            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={openCreate}
                  disabled={products.length === 0}
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
                    <label className="text-sm font-medium text-gray-700">Produto<RequiredMark /></label>
                    <select
                      value={form.product_id}
                      disabled={!!editingId}
                      onChange={(e) => setForm((f) => ({ ...f, product_id: Number(e.target.value) }))}
                      className="mt-1 w-full border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                      required
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
                    <label className="text-sm font-medium text-gray-700">Título<RequiredMark /></label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ex.: Picanha em promoção"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Descrição (opcional)</label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      placeholder="Ex.: Oferta válida enquanto durarem os estoques."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de desconto<RequiredMark /></label>
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
                      <label className="text-sm font-medium text-gray-700">Desconto (%)<RequiredMark /></label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={form.discount_percentage}
                        onChange={(e) => setForm((f) => ({ ...f, discount_percentage: e.target.value }))}
                        placeholder="Ex.: 20"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Preço promocional (R$)<RequiredMark /></label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.promotional_price}
                        onChange={(e) => setForm((f) => ({ ...f, promotional_price: e.target.value }))}
                        placeholder="Ex.: 69,90"
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Início<RequiredMark /></label>
                      <Input
                        type="datetime-local"
                        value={form.starts_at}
                        onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Término<RequiredMark /></label>
                      <Input
                        type="datetime-local"
                        value={form.ends_at}
                        onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                        required
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
            </>
          }
        />

        {!unitsLoading && units.length === 0 && (
          <div className="text-center text-red-600">Nenhuma unidade encontrada para este usuário.</div>
        )}

        {!loading && unitId && products.length === 0 && (
          <div className="text-center text-amber-600">
            Esta unidade ainda não tem produtos cadastrados — cadastre um produto antes de criar uma promoção.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_13rem]">
          <SearchField value={search} onValueChange={setSearch} label="Buscar promoções" placeholder="Buscar promoção ou produto" />
          <select aria-label="Filtrar por status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input">
            <option value="">Todos os status</option>
            <option value="Ativa">Ativas</option>
            <option value="Agendada">Agendadas</option>
            <option value="Expirada">Expiradas</option>
            <option value="Inativa">Inativas</option>
          </select>
        </div>

        {error ? <div className="p-6 text-red-700" role="alert">{error}</div> : <ReusableTable data={pagination.pageData} columns={columns} caption="Promoções cadastradas" keyExtractor={row => row.id} isLoading={loading} emptyMessage="Nenhuma promoção encontrada." footer={<DataPagination {...pagination} isLoading={loading} />} />}
      </div>
    </div>
  )
}
