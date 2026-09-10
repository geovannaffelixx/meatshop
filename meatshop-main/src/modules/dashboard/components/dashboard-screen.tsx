'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/components/ui/carousel"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"
import { apiGet, resolveAssetUrl } from "@/shared/lib/api"
import { useManagedUnits } from "@/shared/hooks/use-managed-units"
import { formatCurrency } from "@/shared/lib/formatters"
import { PageHeader } from "@/shared/components/page-header"
import { AlertTriangle, ArrowRight, PackageOpen, ShoppingBag, TrendingUp } from "lucide-react"
import Autoplay from "embla-carousel-autoplay"

const chartConfig = {
  vendas: { label: "Receita", color: "#525252" },
} satisfies ChartConfig

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

type DashboardData = {
  revenueThisMonth: number
  weeklyChart: {
    series: { date: string; orderCount: number; revenue: number }[]
  }
  recentOrders: {
    id: number
    client_name: string | null
    status: string
    value: number
    order_date: string
  }[]
  pendingOrdersCount: number
  lowStockCount: number
  topProducts: { product_id: number; product_name: string; quantity_sold: number; revenue: number }[]
}

type Sale = { id: number; name: string; imageUrl: string; discountValue: number }

export function DashboardScreen() {
  const promotionAutoplay = useMemo(
    () => Autoplay({ delay: 4500, stopOnInteraction: true, stopOnMouseEnter: true }),
    [],
  )
  const { unitId } = useManagedUnits()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loadingSales, setLoadingSales] = useState(true)
  const [errorSales, setErrorSales] = useState<string | null>(null)

  useEffect(() => {
    if (!unitId) return
    let active = true
    setLoadingSales(true)
    setErrorSales(null)

    apiGet(`/sales?unit_id=${unitId}`)
      .then((list) => { if (active) setSales(Array.isArray(list) ? list : []) })
      .catch((e) => { if (active) setErrorSales(e.message) })
      .finally(() => { if (active) setLoadingSales(false) })

    return () => { active = false }
  }, [unitId])

  useEffect(() => {
    if (!unitId) return
    let active = true
    setLoading(true)

    apiGet(`/dashboard?unit_id=${unitId}`)
      .then((d) => { if (active) setDashboard(d) })
      .catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [unitId])

  const chartData = useMemo(() => {
    if (!dashboard?.weeklyChart?.series?.length) {
      return WEEKDAY_LABELS.map((day) => ({ day, vendas: 0 }))
    }
    return dashboard.weeklyChart.series.map((s) => ({
      day: WEEKDAY_LABELS[new Date(s.date).getDay()],
      vendas: s.revenue,
    }))
  }, [dashboard])

  const pendingOrders = useMemo(() => {
    return dashboard?.recentOrders ?? []
  }, [dashboard])

  return (
    <div className="page-surface">
      <div className="page-container">
        <PageHeader
          eyebrow="Visão geral"
          title="Painel da operação"
          description="Acompanhe pedidos, receita, estoque e campanhas da unidade selecionada."
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Receita no mês</p>
                <strong className="mt-1 block text-2xl text-slate-950">
                  {formatCurrency(dashboard?.revenueThisMonth)}
                </strong>
              </div>
              <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <TrendingUp className="size-5" />
              </span>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Pedidos pendentes</p>
                <strong className="mt-1 block text-2xl text-slate-950">
                  {dashboard?.pendingOrdersCount ?? 0}
                </strong>
              </div>
              <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <ShoppingBag className="size-5" />
              </span>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Estoque baixo</p>
                <strong className="mt-1 block text-2xl text-slate-950">
                  {dashboard?.lowStockCount ?? 0}
                </strong>
              </div>
              <span className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <AlertTriangle className="size-5" />
              </span>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Promoções ativas</p>
                <strong className="mt-1 block text-2xl text-slate-950">
                  {sales.length}
                </strong>
              </div>
              <span className="rounded-xl bg-red-50 p-3 text-red-700">
                <PackageOpen className="size-5" />
              </span>
            </CardContent>
          </Card>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">Pedidos pendentes</h2>
              <p className="text-sm text-slate-500">Priorize os pedidos que aguardam confirmação.</p>
            </div>
            <Link href="/orders" className="flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline">
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </div>

          {loading && <p className="p-8 text-center text-slate-500">Carregando pedidos...</p>}
          {error && <p className="p-8 text-center text-red-700">{error}</p>}

          {!loading && !error && pendingOrders.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Não há pedidos aguardando confirmação.
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {pendingOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-red-200 hover:bg-red-50/40"
                >
                  <span className="min-w-0">
                    <strong className="block text-sm text-slate-900">Pedido #{order.id}</strong>
                    <span className="block truncate text-sm text-slate-500">{order.client_name ?? "Cliente não identificado"}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <strong className="block text-sm text-slate-800">{formatCurrency(order.value)}</strong>
                    <time className="text-xs text-slate-500">
                      {new Date(order.order_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <Card className="h-80 min-w-0 overflow-hidden border-0 shadow-sm">
            <Link href="/finance" className="block">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-950">Receita semanal</CardTitle>
                  <CardDescription>
                    Consulte o detalhamento financeiro da unidade.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig}>
                    <BarChart accessibilityLayer data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="day" tickLine={false} tickMargin={10} axisLine={false} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="vendas" fill="var(--color-vendas)" radius={8} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
            </Link>
          </Card>

          <section className="h-80 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-950">Promoções ativas</h2>
                <p className="text-sm text-slate-500">Campanhas disponíveis para os clientes.</p>
              </div>
              <Link href="/promotions" className="text-sm font-semibold text-red-700 hover:underline">Gerenciar</Link>
            </div>

            {loadingSales && <p className="p-8 text-center text-slate-500">Carregando promoções...</p>}
            {errorSales && <p className="p-8 text-center text-red-700">{errorSales}</p>}
            {!loadingSales && !errorSales && sales.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">Nenhuma promoção ativa no momento.</p>
            )}

            {sales.length > 0 && (
              <Carousel
                className="w-full min-w-0"
                opts={{ align: "start", loop: sales.length > 1 }}
                plugins={sales.length > 1 ? [promotionAutoplay] : undefined}
              >
                <CarouselContent>
                  {sales.map((s) => (
                    <CarouselItem key={s.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex h-28 w-full items-center justify-center bg-white">
                          <Image
                            src={resolveAssetUrl(s.imageUrl)}
                            alt={s.name}
                            width={160}
                            height={120}
                            unoptimized
                            className="h-full w-full object-contain p-2"
                          />
                        </div>
                        <div className="p-3">
                          <span className="block truncate text-sm font-semibold text-slate-900">{s.name}</span>
                          <span className="mt-1 block text-xs font-medium text-emerald-700">Economize {formatCurrency(s.discountValue)}</span>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 text-red-700" />
                <CarouselNext className="right-2 text-red-700" />
              </Carousel>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
