"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Spinner } from "@/shared/components/ui/spinner"
import { CalendarDays, Plus, Search, UtensilsCrossed } from "lucide-react"
import { apiDelete, apiGet, resolveAssetUrl } from "@/shared/lib/api"
import { toast } from "@/shared/lib/toast"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { PageHeader } from "@/shared/components/page-header"
import { EmptyState } from "@/shared/components/empty-state"
import { Input } from "@/shared/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

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
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  const now = new Date()
  return start <= now && now < end
}

export function RecipesScreen() {
  const { units, unitId, setUnitId, loading: unitsLoading } = useManagedUnits()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Recipe | null>(null)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const [search, setSearch] = useState("")

  const filteredRecipes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    if (!term) return recipes
    return recipes.filter((recipe) =>
      `${recipe.title} ${recipe.tag ?? ""}`.toLocaleLowerCase("pt-BR").includes(term),
    )
  }, [recipes, search])

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
    <div className="page-surface">
      <div className="page-container">
        <PageHeader
          eyebrow="Marketing"
          title="Receitas"
          description="Publique conteúdos que aproximam os clientes dos produtos da unidade."
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

            <Button asChild className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
              <Link href="/recipes/new">
                <Plus size={18} />
                Nova receita
              </Link>
            </Button>
            </>
          }
        />

        {!unitsLoading && units.length === 0 && (
          <div className="text-center text-red-600">Nenhuma unidade encontrada para este usuário.</div>
        )}

        <label className="relative block max-w-xl">
          <span className="sr-only">Buscar receitas</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título ou tag" className="pl-9" />
        </label>

        {loading ? (
          <div className="p-6 text-center italic text-gray-500">Carregando receitas...</div>
        ) : error ? (
          <div className="p-4 text-center font-semibold text-red-600">Erro: {error}</div>
        ) : filteredRecipes.length === 0 ? (
          <Card className="border-0 bg-white shadow-sm">
            <EmptyState
              icon={UtensilsCrossed}
              title={recipes.length ? "Nenhuma receita encontrada" : "Nenhuma receita cadastrada"}
              description={recipes.length ? "Tente buscar por outro título ou tag." : "Crie a primeira receita para divulgar produtos da unidade."}
              action={!recipes.length ? <Button asChild><Link href="/recipes/new"><Plus />Nova receita</Link></Button> : undefined}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="overflow-hidden border-0 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="h-36 w-full bg-gray-200">
                  {recipe.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveAssetUrl(recipe.image_url)}
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

      <Dialog open={Boolean(removing)} onOpenChange={(nextOpen) => !nextOpen && setRemoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover receita?</DialogTitle>
            <DialogDescription>
              A receita {removing?.title} será removida permanentemente, junto com ingredientes e modo de preparo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={confirmingRemoval} onClick={() => setRemoving(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={confirmingRemoval} onClick={() => void confirmRemove()}>
              {confirmingRemoval && <Spinner />}
              {confirmingRemoval ? "Removendo..." : "Remover receita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
