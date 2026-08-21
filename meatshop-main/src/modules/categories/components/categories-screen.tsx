"use client"

import { useEffect, useState } from "react"
import PageLayout from "@/shared/components/page-layout"
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
import { Plus } from "lucide-react"
import { apiGet, apiPatch, apiPost } from "@/shared/lib/api"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"

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
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar categoria.")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (category: Category) => {
    if (!unitId) return
    try {
      await apiPatch(`/categories/${category.id}`, { active: !category.active })
      await loadCategories(unitId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar categoria.")
    }
  }

  return (
    <PageLayout title="Categorias" image="/logoClaraEscrita.png">
      <div className="min-h-screen w-full bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-3xl font-bold text-red-700">Categorias</h2>

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
                    className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                  >
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
                      <label className="text-sm font-medium text-gray-700">Nome</label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                        {saving ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {!unitsLoading && units.length === 0 && (
            <div className="text-center text-red-600">
              Nenhuma unidade encontrada para este usuário.
            </div>
          )}

          <Card className="bg-white/70 backdrop-blur-md shadow-lg">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-gray-500 italic">Carregando categorias...</div>
              ) : error ? (
                <div className="p-4 text-red-600 font-semibold">Erro: {error}</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold">
                    <tr>
                      <th className="p-3">Nome</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length > 0 ? (
                      categories.map((category) => (
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
                          <td className="p-3 text-center space-x-3">
                            <button
                              onClick={() => openEdit(category)}
                              className="text-red-600 font-semibold hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => toggleActive(category)}
                              className="text-gray-600 font-semibold hover:underline"
                            >
                              {category.active ? "Desativar" : "Ativar"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center p-6 text-gray-500 italic">
                          Nenhuma categoria cadastrada ainda.
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
    </PageLayout>
  )
}
