"use client"

import { toDateInput } from "@/shared/lib/date-time";

import { useServerList } from "@/shared/hooks/use-server-list";
import { DataPagination } from "@/shared/components/data-pagination";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Spinner } from "@/shared/components/ui/spinner"
import { CalendarDays, Plus, UtensilsCrossed } from "lucide-react"
import { apiDelete, resolveAssetUrl } from "@/shared/lib/api"
import { toast } from "@/shared/lib/toast"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { SearchField } from "@/shared/components/search-field";
import { PageHeader } from "@/shared/components/page-header"
import { EmptyState } from "@/shared/components/empty-state"
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
  const start = toDateInput(weekStart);
  if (!start) return false;
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const today = toDateInput(new Date());
  return today >= start && today < end.toISOString().slice(0, 10);
}

export function RecipesScreen() {
  const { units, unitId, loading: unitsLoading } = useManagedUnits()

  const [search, setSearch] = useState('');
  const query = useServerList<Recipe>(unitId ? `/recipes/manage?unit_id=${unitId}` : null, search);
  const recipes = query.rows;
  const loading = query.isPending;
  const error = query.error?.message;
  const [removing, setRemoving] = useState<Recipe | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  const confirmRemove = async () => {
    if (!removing || !unitId) return
    setConfirmingRemoval(true)
    try {
      await apiDelete(`/recipes/${removing.id}`)
      toast.success("Receita removida com sucesso.")
      setRemoving(null)
      await query.refetch()
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


            {recipes.length > 0 && (
              <Button asChild className="flex items-center gap-2">
                <Link href="/recipes/new">
                  <Plus size={18} />
                  Nova receita
                </Link>
              </Button>
            )}
            </>
          }
        />

        {!unitsLoading && units.length === 0 && (
          <div className="text-center text-red-600">Nenhuma unidade encontrada para este usuário.</div>
        )}

        <SearchField value={search} onValueChange={setSearch} label="Buscar receitas" placeholder="Buscar por título ou tag" className="max-w-xl" />

        {loading ? (
          <DataSkeleton label="Carregando receitas..." />
        ) : error ? (
          <div className="p-4 text-center font-semibold text-red-600">Erro: {error}</div>
        ) : recipes.length === 0 ? (
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
            {recipes.map((recipe) => (
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

      <DataPagination {...query.pagination} isLoading={loading} />
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
