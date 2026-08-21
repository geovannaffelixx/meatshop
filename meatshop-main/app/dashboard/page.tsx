'use client'

import { useEffect, useMemo, useState } from "react"
import PageLayout from "@/components/page-layout"
import Link from "next/link"
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { apiGet } from "@/lib/api"
import { useManagedUnits } from "@/hooks/use-managed-units"

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
  lowStockCount: number
  topProducts: { product_id: number; product_name: string; quantity_sold: number; revenue: number }[]
}

type Sale = { id: number; name: string; imageUrl: string; discountValue: number }

export default function Page() {
  const { unitId } = useManagedUnits()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loadingSales, setLoadingSales] = useState(true)
  const [errorSales, setErrorSales] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    apiGet("/sales")
      .then((list) => { if (active) setSales(Array.isArray(list) ? list : []) })
      .catch((e) => { if (active) setErrorSales(e.message) })
      .finally(() => { if (active) setLoadingSales(false) })

    return () => { active = false }
  }, [])

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

  const pedidosPendentes = useMemo(() => {
    return (dashboard?.recentOrders ?? [])
      .filter((o) => o.status === "PENDING")
      .slice(0, 20)
  }, [dashboard])

  return (
    <PageLayout title="Dashboard" image="/logoClaraEscrita.png">
      <div className="min-h-screen w-full bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
        <div className="container mx-auto px-4 py-6 space-y-8">

          {/* Pedidos pendentes */}
          <div className="bg-gray/70 backdrop-blur-md rounded-xl p-6 shadow">
            <h2 className="text-2xl font-bold text-red-700 text-center mb-4">
              Pedidos pendentes
            </h2>

            {loading && <p className="text-center text-gray-500">Carregando...</p>}
            {error && <p className="text-center text-red-600">Erro: {error}</p>}

            {!loading && !error && pedidosPendentes.length === 0 && (
              <p className="text-center text-gray-500 italic">Nenhum pedido pendente.</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {pedidosPendentes.map((pedido) => (
                <div key={pedido.id} className="flex justify-between items-center bg-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="font-semibold">#{pedido.id}</span>
                  <span>{pedido.client_name ?? "-"}</span>
                  <span className="text-gray-500">
                    {new Date(pedido.order_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2 text-right">
              <Link href="/orders" className="text-red-600 text-sm font-medium hover:underline">
                Ver todos
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* Financeiro */}
            <Card className="bg-gray/70 backdrop-blur-md rounded-xl shadow md:col-span-1">
              <a href="/finance">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-red-700 text-center">Financeiro</CardTitle>
                  <CardDescription className="text-center">
                    Receita do mês: R$ {Number(dashboard?.revenueThisMonth ?? 0).toFixed(2)}
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
                  {dashboard && dashboard.lowStockCount > 0 && (
                    <Link
                      href="/products"
                      className="mt-3 block text-center text-sm text-amber-600 font-medium hover:underline"
                    >
                      {dashboard.lowStockCount} produto(s) com estoque baixo
                    </Link>
                  )}
                </CardContent>
              </a>
            </Card>

            {/* Carrossel de promoções (Sales) */}
            <div className="bg-gray/70 backdrop-blur-md rounded-xl p-6 md:col-span-3 shadow-md">
              <a href="estoque">
                <h2 className="text-2xl font-bold text-red-700 text-center mb-4">Promoções ativas</h2>

                {loadingSales && <p className="text-center text-gray-500">Carregando promoções...</p>}
                {errorSales && <p className="text-center text-red-600">Erro: {errorSales}</p>}

                <Carousel plugins={[Autoplay({ delay: 2500, stopOnInteraction: true })]} className="w-full mx-auto" opts={{ align: "start", loop: true }}>
                  <CarouselContent>
                    {sales.map((s) => (
                      <CarouselItem key={s.id} className="basis-1/5">
                        <div className="flex flex-col items-center justify-center bg-gray-200 rounded-lg overflow-hidden aspect-square">
                          <div className="w-full bg-gray-200 rounded-t-lg overflow-hidden flex items-center justify-center"
                              style={{ height: "120px" }}>
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}${s.imageUrl}`}
                              alt={s.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="text-sm font-medium mt-2 text-center">{s.name}</span>
                          <span className="text-xs text-gray-500 text-center">Desconto: R$ {s.discountValue}</span>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="text-red-600" />
                  <CarouselNext className="text-red-600" />
                </Carousel>
              </a>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
