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
import { RequiredMark } from "@/shared/components/ui/required-mark"
import { Spinner } from "@/shared/components/ui/spinner"
import { Plus, Search, Tags } from "lucide-react"
import { apiGet, apiPatch, apiPost } from "@/shared/lib/api"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { PageHeader } from "@/shared/components/page-header"
import { EmptyState } from "@/shared/components/empty-state"
import { toast } from "@/shared/lib/toast"

type Category = {
  id: number
  name: string
  description: string | null
  active: boolean
  unit_id: number
}

type FormState = {
  name: string
  description: string
  active: boolean
}

const EMPTY_FORM: FormState = { name: "", description: "", active: true }

export function CategoriesScreen() {
  const { units, unitId, setUnitId, loading: unitsLoading } = useManagedUnits()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [search, setSearch] = useState("")

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    if (!term) return categories
    return categories.filter((category) =>
      `${category.name} ${category.description ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    )
  }, [categories, search])

  const loadCategories = async (unit: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(`/categories?unit_id=${unit}`)
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar categorias.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!unitId) return
    loadCategories(unitId)
  }, [unitId])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditingId(category.id)
    setForm({
      name: category.name,
      description: category.description ?? "",
      active: category.active,
    })
    setFormError(null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Informe o nome da categoria.")
      return
    }
    if (!unitId) {
      setFormError("Nenhuma unidade selecionada.")
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        active: form.active,
      }

      if (editingId) {
        await apiPatch(`/categories/${editingId}`, payload)
      } else {
        await apiPost("/categories", { ...payload, unit_id: unitId })
      }

      setOpen(false)
      await loadCategories(unitId)
      toast.success(editingId ? "Categoria atualizada." : "Categoria criada.")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar categoria.")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (category: Category) => {
    if (!unitId || togglingId) return
    setTogglingId(category.id)
    try {
      await apiPatch(`/categories/${category.id}`, { active: !category.active })
      await loadCategories(unitId)
      toast.success(category.active ? "Categoria desativada." : "Categoria ativada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar categoria.")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="page-surface">
        <div className="page-container">
          <PageHeader
            eyebrow="Catálogo"
            title="Categorias"
            description="Organize os produtos em categorias fáceis de encontrar."
            actions={
              <>
              {units.length > 1 && (
                <select
                  aria-label="Unidade ativa"
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
                  <Button onClick={openCreate}>
                    <Plus size={18} />
                    Nova categoria
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-50 border border-gray-300 rounded-2xl shadow-2xl max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-red-700">
                      {editingId ? "Editar categoria" : "Nova categoria"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nome<RequiredMark /></label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Ex.: Cortes bovinos"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Descrição (opcional)</label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        rows={3}
                        placeholder="Ex.: Cortes selecionados de carne bovina."
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                      />
                      Categoria ativa
                    </label>

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
                        {saving ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </>
            }
          />

          {!unitsLoading && units.length === 0 && (
            <div className="text-center text-red-600">
              Nenhuma unidade encontrada para este usuário.
            </div>
          )}

          <label className="relative block max-w-xl">
            <span className="sr-only">Buscar categorias</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou descrição"
              className="pl-9"
            />
          </label>

          <Card className="overflow-hidden border-0 bg-white shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-10 text-center text-slate-500">Carregando categorias...</div>
              ) : error ? (
                <div className="p-10 text-center">
                  <p className="font-semibold text-red-700">{error}</p>
                  {unitId && <button type="button" onClick={() => void loadCategories(unitId)} className="mt-3 text-sm font-semibold text-red-700 hover:underline">Tentar novamente</button>}
                </div>
              ) : filteredCategories.length === 0 ? (
                <EmptyState
                  icon={Tags}
                  title={categories.length ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
                  description={categories.length ? "Tente usar outro termo de busca." : "Crie uma categoria para começar a organizar o catálogo."}
                  action={!categories.length ? <Button onClick={openCreate}><Plus />Nova categoria</Button> : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                <table className="data-table">
                  <caption className="sr-only">Categorias cadastradas</caption>
                  <thead className="bg-gray-100 text-gray-700 font-semibold">
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">Descrição</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category) => (
                        <tr key={category.id} className="border-t hover:bg-gray-50">
                          <td className="p-3 font-medium">{category.name}</td>
                          <td className="p-3 text-gray-600">{category.description ?? "-"}</td>
                          <td className="p-3">
                            <span
                              className={
                                category.active
                                  ? "text-green-700 font-semibold"
                                  : "text-gray-500 font-semibold"
                              }
                            >
                              {category.active ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                          <td className="space-x-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => openEdit(category)}
                              className="text-red-600 font-semibold hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => toggleActive(category)}
                              disabled={togglingId === category.id}
                              className="text-gray-600 font-semibold hover:underline disabled:opacity-50"
                            >
                              {togglingId === category.id ? "Atualizando..." : category.active ? "Desativar" : "Ativar"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
