"use client"

import { ReusableTable, type TableColumn } from "@/shared/components/reusable-table";
import { DataPagination } from "@/shared/components/data-pagination";
import { useServerList } from "@/shared/hooks/use-server-list";




import { useState } from "react"
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
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { SearchField } from "@/shared/components/search-field";
import { PageHeader } from "@/shared/components/page-header"

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
  const { units, unitId, loading: unitsLoading } = useManagedUnits()

  const [search, setSearch] = useState("");
  const query = useServerList<Category>(unitId ? `/categories?unit_id=${unitId}` : null, search);
  const pagination = query.pagination;
  const loading = query.isPending;
  const [actionError, setError] = useState<string | null>(null);
  const error = actionError ?? query.error?.message;


  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

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
      await query.refetch()
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
      await query.refetch()
      toast.success(category.active ? "Categoria desativada." : "Categoria ativada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar categoria.")
    } finally {
      setTogglingId(null)
    }
  }

  const columns: TableColumn<Category>[] = [
    { id: 'name', header: 'Nome', accessor: 'name', className: 'font-medium' },
    { id: 'description', header: 'Descrição', accessor: row => row.description ?? '—', className: 'text-slate-600' },
    { id: 'status', header: 'Status', accessor: row => <span className={row.active ? 'font-semibold text-emerald-700' : 'font-semibold text-slate-500'}>{row.active ? 'Ativa' : 'Inativa'}</span> },
    { id: 'actions', header: 'Ações', textAlign: 'end', accessor: row => <div className="flex justify-end gap-3">
      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>Editar</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => void toggleActive(row)} disabled={togglingId === row.id}>{togglingId === row.id ? 'Atualizando...' : row.active ? 'Desativar' : 'Ativar'}</Button>
    </div> },
  ];

  return (
    <div className="page-surface">
        <div className="page-container">
          <PageHeader
            eyebrow="Catálogo"
            title="Categorias"
            description="Organize os produtos em categorias fáceis de encontrar."
            actions={
              <>


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

          <SearchField value={search} onValueChange={setSearch} label="Buscar categorias" placeholder="Buscar por nome ou descrição" className="max-w-xl" />

          {error ? <div className="p-6 text-red-700" role="alert">{error}<button type="button" onClick={() => { setError(null); void query.refetch(); }} className="ml-3 underline">Tentar novamente</button></div> : <ReusableTable data={query.rows} columns={columns} caption="Categorias cadastradas" keyExtractor={row => row.id} isLoading={loading} emptyMessage="Nenhuma categoria encontrada." footer={<DataPagination {...pagination} isLoading={loading} />} />}
      </div>
    </div>
  )
}
