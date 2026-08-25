"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Star, Store } from "lucide-react"
import { apiGet } from "@/shared/lib/api"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"

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
    <div className="flex items-center gap-0.5" aria-label={`Nota ${rating} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={16}
          className={i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}
        />
      ))}
    </div>
  )
}

function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

export function ReviewsScreen() {
  const { units, unitId, setUnitId, loading: unitsLoading } = useManagedUnits()

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "unit" | number>("all")

  useEffect(() => {
    if (!unitId) return
    setLoading(true)
    setError(null)
    apiGet(`/reviews?unit_id=${unitId}`)
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar avaliações."))
      .finally(() => setLoading(false))
  }, [unitId])

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
    <div className="min-h-screen w-full bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-3xl font-bold text-red-700">Avaliações</h2>

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
        </div>

        {!unitsLoading && units.length === 0 && (
          <div className="text-center text-red-600">Nenhuma unidade encontrada para este usuário.</div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-md shadow-lg">
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
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === "all" ? "bg-red-600 text-white" : "bg-white text-gray-700 border"}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter("unit")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${filter === "unit" ? "bg-red-600 text-white" : "bg-white text-gray-700 border"}`}
            >
              <Store size={14} />
              Sobre o açougue
            </button>
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setFilter(p.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === p.id ? "bg-red-600 text-white" : "bg-white text-gray-700 border"}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="p-6 text-center italic text-gray-500">Carregando avaliações...</div>
          ) : error ? (
            <div className="p-4 text-center font-semibold text-red-600">Erro: {error}</div>
          ) : filtered.length === 0 ? (
            <Card className="bg-white/70 backdrop-blur-md shadow-lg">
              <CardContent className="p-6 text-center italic text-gray-500">
                {reviews.length === 0 ? "Nenhuma avaliação recebida ainda." : "Nenhuma avaliação para este filtro."}
              </CardContent>
            </Card>
          ) : (
            filtered.map((review) => (
              <Card key={review.id} className="bg-white/70 backdrop-blur-md shadow-lg">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-800">{review.client_name}</span>
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
                    <span className="text-xs text-gray-500">{formatDateBR(review.created_at)}</span>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-gray-700">{review.comment}</p>}
                  <p className="mt-2 text-xs text-gray-400">Pedido #{review.order_id}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
