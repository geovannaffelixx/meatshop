"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Spinner } from "@/shared/components/ui/spinner"
import { CalendarDays, Plus } from "lucide-react"
import { apiDelete, apiGet, API_URL } from "@/shared/lib/api"
import { toast } from "@/shared/lib/toast"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"

type Recipe = {
  id: number
  unit_id: number
  title: string
  image_url: string | null
  tag: string | null
  active: boolean
  display_order: number
  week_start: string | null
}

function isCurrentWeek(weekStart: string | null) {
  if (!weekStart) return false
  return new Date(weekStart) <= new Date()
}

export function RecipesScreen() {
  const { units, unitId, setUnitId, loading: unitsLoading } = useManagedUnits()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Recipe | null>(null)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)

  const loadRecipes = async (unit: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(`/recipes?unit_id=${unit}`)
      setRecipes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar receitas.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!unitId) return
    loadRecipes(unitId)
  }, [unitId])

  const confirmRemove = async () => {
    if (!removing || !unitId) return
    setConfirmingRemoval(true)
    try {
      await apiDelete(`/recipes/${removing.id}`)
      toast.success("Receita removida com sucesso.")
      setRemoving(null)
      await loadRecipes(unitId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover receita.")
    } finally {
      setConfirmingRemoval(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-3xl font-bold text-red-700">Receitas</h2>

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

            <Button asChild className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
              <Link href="/recipes/new">
                <Plus size={18} />
                Nova receita
              </Link>
            </Button>
          </div>
        </div>

        {!unitsLoading && units.length === 0 && (
          <div className="text-center text-red-600">Nenhuma unidade encontrada para este usuário.</div>
        )}

        {loading ? (
          <div className="p-6 text-center italic text-gray-500">Carregando receitas...</div>
        ) : error ? (
          <div className="p-4 text-center font-semibold text-red-600">Erro: {error}</div>
        ) : recipes.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-md shadow-lg">
            <CardContent className="p-6 text-center italic text-gray-500">
              Nenhuma receita cadastrada ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="overflow-hidden bg-white/70 backdrop-blur-md shadow-lg">
                <div className="h-36 w-full bg-gray-200">
                  {recipe.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${API_URL}${recipe.image_url}`}
                      alt={recipe.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                      Sem foto
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-800">{recipe.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${recipe.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {recipe.active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {recipe.tag && <span className="rounded-full bg-gray-100 px-2 py-0.5">{recipe.tag}</span>}
                    {isCurrentWeek(recipe.week_start) && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                        <CalendarDays size={12} />
                        Receita da semana
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end gap-3 text-sm">
                    <Link href={`/recipes/${recipe.id}`} className="font-semibold text-red-600 hover:underline">
                      Editar
                    </Link>
                    <button onClick={() => setRemoving(recipe)} className="font-semibold text-gray-600 hover:underline">
                      Excluir
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {removing && (
        <div role="dialog" aria-modal="true" aria-labelledby="remove-recipe-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="remove-recipe-title" className="text-lg font-bold">Remover receita?</h2>
            <p className="mt-2 text-gray-600">
              A receita <strong>{removing.title}</strong> será removida permanentemente, junto com seus ingredientes e modo de preparo.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button disabled={confirmingRemoval} onClick={() => setRemoving(null)} className="rounded-md border px-4 py-2 disabled:opacity-50">
                Cancelar
              </button>
              <button
                disabled={confirmingRemoval}
                onClick={() => void confirmRemove()}
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {confirmingRemoval && <Spinner />}
                {confirmingRemoval ? "Removendo..." : "Remover receita"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
