'use client'

import { useEffect, useMemo, useState } from "react"
import PadraoPage from "@/components/layoutPadrao"
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

const chartConfig = {
  vendas: { label: "Vendas", color: "#525252" },
} satisfies ChartConfig

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [loadingSales, setLoadingSales] = useState(true)
  const [errorSales, setErrorSales] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    // Dashboard
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard`, { cache: "no-store" })
      .then(res => res.json())
      .then(d => { if (active) setDashboard(d) })
      .catch(e => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })

    // Sales
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/sales`, { cache: "no-store" })
      .then(res => res.json())
      .then(list => { if (active) setSales(list) })
      .catch(e => { if (active) setErrorSales(e.message) })
      .finally(() => { if (active) setLoadingSales(false) })

    return () => { active = false }
  }, [])

  const chartData = useMemo(() => {
    if (dashboard?.vendasSemana?.length) return dashboard.vendasSemana
    return [
      { day: "Seg", vendas: 0 },
      { day: "Ter", vendas: 0 },
      { day: "Qua", vendas: 0 },
      { day: "Qui", vendas: 0 },
      { day: "Sex", vendas: 0 },
      { day: "Sab", vendas: 0 },
      { day: "Dom", vendas: 0 },
    ]
  }, [dashboard])

  const pedidos = useMemo(() => {
    return (dashboard?.pedidosRecentes ?? [])
      .filter((p: any) => p.status?.toLowerCase() === "pendente")
      .slice(0, 20)
      .map((p:any) => ({
        id: `#${p.id}`,
        cliente: p.cliente,
        tempo: "—",
      }))
  }, [dashboard])

  return (
    <PadraoPage titulo="Dashboard" imagem="/logoClaraEscrita.png">
      <div className="min-h-screen w-full bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
        <div className="container mx-auto px-4 py-6 space-y-8">

          {/* Pedidos pendentes */}
          <div className="bg-gray/70 backdrop-blur-md rounded-xl p-6 shadow">
            <h2 className="text-2xl font-bold text-red-700 text-center mb-4">
              Pedidos pendentes
            </h2>

            {loading && <p className="text-center text-gray-500">Carregando...</p>}
            {error && <p className="text-center text-red-600">Erro: {error}</p>}

            <div className="grid grid-cols-2 gap-3">
              {pedidos.map((pedido:any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="font-semibold">{pedido.id}</span>
                  <span>{pedido.cliente}</span>
                  <span className="text-gray-500">tempo de espera: {pedido.tempo}</span>
                </div>
              ))}
            </div>

            <div className="mt-2 text-right">
              <Link href="/pedidos" className="text-red-600 text-sm font-medium hover:underline">
                Ver todos
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* Financeiro */}
            <Card className="bg-gray/70 backdrop-blur-md rounded-xl shadow md:col-span-1">
              <a href="/financeiro">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-red-700 text-center">Financeiro</CardTitle>
                  <CardDescription className="text-center">Total de vendas (Segunda a Domingo)</CardDescription>
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
    </PadraoPage>
  )
}
