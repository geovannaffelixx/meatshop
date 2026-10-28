"use client"

import { EmptyState } from "@/shared/components/empty-state";
import { formatDateValue } from "@/shared/lib/date-time";

import { useApiQuery } from "@/shared/hooks/use-api-query";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { UserRound } from "lucide-react"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Star, Store } from "lucide-react"

import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { PageHeader } from "@/shared/components/page-header"

type Review = {
  id: number
  order_id: number
  unit_id: number
  client_name: string
  product_id: number | null
  product_name: string | null
  rating: number
  comment: string | null
  created_at: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`Nota ${rating} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={16}
          aria-hidden="true"
          className={i < rating ? "fill-amber-700 text-amber-700" : "text-gray-500"}
        />
      ))}
    </div>
  )
}



export function ReviewsScreen() {
  const { units, unitId, loading: unitsLoading } = useManagedUnits()

  const query = useApiQuery<Review[]>(unitId ? `/reviews?unit_id=${unitId}` : null);
  const reviews = useMemo(() => query.data ?? [], [query.data]);
  const loading = query.isPending;
  const error = query.error?.message;
  const [filter, setFilter] = useState<"all" | "unit" | number>("all")

  const products = useMemo(() => {
    const map = new Map<number, string>()
    reviews.forEach((r) => {
      if (r.product_id && r.product_name) map.set(r.product_id, r.product_name)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [reviews])

  const filtered = useMemo(() => {
    if (filter === "all") return reviews
    if (filter === "unit") return reviews.filter((r) => r.product_id === null)
    return reviews.filter((r) => r.product_id === filter)
  }, [reviews, filter])

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  }, [reviews])

  return (
    <div className="page-surface">
      <div className="page-container">
        <PageHeader
          eyebrow="Clientes"
          title="Avaliações"
          description="Acompanhe a satisfação com a unidade e com os produtos."
        />

        {!unitsLoading && units.length === 0 && (
          <div className="text-center text-red-600">Nenhuma unidade encontrada para este usuário.</div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-gray-500">Nota média</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-800">{averageRating.toFixed(1)}</span>
                  <StarRating rating={Math.round(averageRating)} />
                </div>
              </div>
              <p className="text-sm text-gray-500">{reviews.length} avaliação{reviews.length === 1 ? "" : "ões"}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && reviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all"}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === "all" ? "bg-red-700 text-white" : "bg-white text-gray-700 border"}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter("unit")}
              aria-pressed={filter === "unit"}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${filter === "unit" ? "bg-red-700 text-white" : "bg-white text-gray-700 border"}`}
            >
              <Store size={14} />
              Sobre o açougue
            </button>
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setFilter(p.id)}
                aria-pressed={filter === p.id}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === p.id ? "bg-red-700 text-white" : "bg-white text-gray-700 border"}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <DataSkeleton label="Carregando avaliações..." />
          ) : error ? (
            <div className="p-4 text-center font-semibold text-red-600">Erro: {error}</div>
          ) : filtered.length === 0 ? (
            <Card className="border-slate-200 bg-white py-0 shadow-sm"><EmptyState icon={Star} title={reviews.length === 0 ? "Nenhuma avaliação recebida ainda" : "Nenhuma avaliação para este filtro"} description={reviews.length === 0 ? "As avaliações dos clientes aparecerão aqui." : "Selecione outro filtro para consultar as avaliações."} /></Card>
          ) : (
            filtered.map((review) => (
              <Card key={review.id} className="border-0 bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound className="size-5" aria-label="Pessoa" /></span>
                      <span className="font-semibold text-gray-800">{review.client_name?.trim().split(/\s+/u)[0] || 'Cliente'}</span>
                      {review.product_name ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {review.product_name}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          <Store size={12} />
                          Açougue
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{formatDateValue(review.created_at, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-gray-700">{review.comment}</p>}
                  <p className="mt-2 text-xs text-gray-600">Pedido #{review.order_id}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
