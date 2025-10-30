'use client'

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

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// AQUI ENTRA O BACKEND: Dados do gráfico de vendas (esses dados devem vir do backend)
const chartData = [
  { day: "Seg", vendas: 2000 },
  { day: "Ter", vendas: 1800 },
  { day: "Qua", vendas: 1500 },
  { day: "Qui", vendas: 2500 },
  { day: "Sex", vendas: 5700 },
  { day: "Sab", vendas: 6711 },
  { day: "Dom", vendas: 3210 },
]

// AQUI ENTRA O BACKEND: Configuração do gráfico de vendas (aqui também seria configurado no backend)
const chartConfig = {
  vendas: {
    label: "Vendas",
    color: "#525252",
  },
} satisfies ChartConfig

export default function Page() {
  // AQUI ENTRA O BACKEND: Lista de pedidos, que deve vir do backend
  const pedidos = Array(20).fill({
    id: "#12345",
    cliente: "Nome do cliente",
    tempo: "5 min",
  })

  return (
    <PadraoPage titulo="Dashboard" imagem="/logoClaraEscrita.png">
      <div className="min-h-screen w-full bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
        <div className="container mx-auto px-4 py-6 space-y-8">

          <div className="bg-gray/70 backdrop-blur-md rounded-xl p-6 shadow">
            <h2 className="text-2xl font-bold text-red-700 text-center mb-4">
              Pedidos pendentes
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {pedidos.map((pedido, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{pedido.id}</span>
                  <span>{pedido.cliente}</span>
                  <span className="text-gray-500">
                    tempo de espera: {pedido.tempo}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right">
              <Link
                href="/pedidos"
                className="text-red-600 text-sm font-medium hover:underline"
              >
                Ver todos
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            <Card className="bg-gray/70 backdrop-blur-md rounded-xl shadow md:col-span-1">
              <a href="/financeiro">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-red-700 text-center ">Financeiro</CardTitle>
                  <CardDescription className="text-center">
                    Total de vendas (Segunda a Domingo)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig}>
                    <BarChart accessibilityLayer data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar dataKey="vendas" fill="var(--color-vendas)" radius={8} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </a>
            </Card>

            {/* Promoções com Carrossel */}
            <div className="bg-gray/70 backdrop-blur-md rounded-xl p-6 md:col-span-3 shadow-md">
              <a href="estoque">
                <h2 className="text-2xl font-bold text-red-700 text-center mb-4">
                  Promoções ativas
                </h2>

                <Carousel
                  plugins={[Autoplay({ delay: 2500, stopOnInteraction: true })]}
                  className="w-full mx-auto"
                  opts={{ align: "start", loop: true }}
                >
                  <CarouselContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <CarouselItem key={i} className="basis-1/5">
                        <div className="flex flex-col items-center justify-center bg-gray-200 rounded-lg overflow-hidden aspect-square">
                          <div className="flex-1 w-full bg-gray-300 flex items-center justify-center text-gray-500">
                            IMAGEM {i}
                          </div>
                          <span className="text-sm font-medium mt-2 text-center">
                            Nome do produto {i}
                          </span>
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
