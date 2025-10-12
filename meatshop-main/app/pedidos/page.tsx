"use client"

import { useState } from "react"
import PadraoPage from "@/components/layoutPadrao"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OrdersTable } from "@/components/orders-table"
import { DateRangeFilter } from "@/components/date-range-filter"
import { SearchFilters } from "@/components/search-filters"

export default function PedidosPage() {
  const [filters, setFilters] = useState({
    dataPedido: { de: "", ate: "" },
    dataAgendada: { de: "", ate: "" },
    dataEntrega: { de: "", ate: "" },
    status: "",
    cliente: { id: "", nome: "", cpf: "" },
  })

  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [currentPage, setCurrentPage] = useState(1)

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  const handleApplyFilters = () => {
    setAppliedFilters(filters) 
    setCurrentPage(1)
  }

  return (
    <PadraoPage titulo="Pedidos" imagem="/logoClaraEscrita.png">
      <div className="min-h-screen w-full bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
        <div className="container mx-auto px-4 py-6 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-red-700 mb-6">Pedidos</h2>
          </div>

          <Card className="bg-gray/70 backdrop-blur-md rounded-xl shadow p-4 mb-6">
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <DateRangeFilter
                  label="Data do pedido"
                  value={filters.dataPedido}
                  onChange={(range) =>
                    handleFilterChange({ ...filters, dataPedido: range })
                  }
                />
                <DateRangeFilter
                  label="Data agendada"
                  value={filters.dataAgendada}
                  onChange={(range) =>
                    handleFilterChange({ ...filters, dataAgendada: range })
                  }
                />
                <DateRangeFilter
                  label="Data da entrega"
                  value={filters.dataEntrega}
                  onChange={(range) =>
                    handleFilterChange({ ...filters, dataEntrega: range })
                  }
                />
              </div>

              <SearchFilters
                value={filters.cliente}
                status={filters.status}
                onChange={(cliente) =>
                  handleFilterChange({ ...filters, cliente })
                }
                onStatusChange={(status) =>
                  handleFilterChange({ ...filters, status })
                }
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleApplyFilters}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Localizar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gray/70 backdrop-blur-md rounded-xl shadow">
            <OrdersTable
              filters={appliedFilters}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>

          <div className="text-center text-gray-600 text-sm mt-8">
            MeatShop © 2025 Todos os direitos reservados
          </div>
        </div>
      </div>
    </PadraoPage>
  )
}