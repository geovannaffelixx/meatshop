"use client"

import { useState } from "react"
import PadraoPage from "@/components/layoutPadrao"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OrdersTable } from "@/components/orders-table"

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

              {/* 1ª linha: datas */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
                {/* Data do pedido */}
                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">Data do pedido</legend>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={filters.dataPedido.de}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          dataPedido: { ...filters.dataPedido, de: e.target.value },
                        })
                      }
                      className="w-full p-2 border rounded-md"
                    />
                    <input
                      type="date"
                      value={filters.dataPedido.ate}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          dataPedido: { ...filters.dataPedido, ate: e.target.value },
                        })
                      }
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </fieldset>

                {/* Data agendada */}
                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">Data agendada</legend>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={filters.dataAgendada.de}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          dataAgendada: { ...filters.dataAgendada, de: e.target.value },
                        })
                      }
                      className="w-full p-2 border rounded-md"
                    />
                    <input
                      type="date"
                      value={filters.dataAgendada.ate}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          dataAgendada: { ...filters.dataAgendada, ate: e.target.value },
                        })
                      }
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </fieldset>

                {/* Data da entrega */}
                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">Data da entrega</legend>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={filters.dataEntrega.de}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          dataEntrega: { ...filters.dataEntrega, de: e.target.value },
                        })
                      }
                      className="w-full p-2 border rounded-md"
                    />
                    <input
                      type="date"
                      value={filters.dataEntrega.ate}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          dataEntrega: { ...filters.dataEntrega, ate: e.target.value },
                        })
                      }
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </fieldset>
              </div>

              {/* 2ª linha: cliente + status */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">ID</legend>
                  <input
                    type="text"
                    value={filters.cliente.id}
                    onChange={(e) =>
                      handleFilterChange({
                        ...filters,
                        cliente: { ...filters.cliente, id: e.target.value },
                      })
                    }
                    className="w-full p-2 border rounded-md"
                  />
                </fieldset>

                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">Nome</legend>
                  <input
                    type="text"
                    value={filters.cliente.nome}
                    onChange={(e) =>
                      handleFilterChange({
                        ...filters,
                        cliente: { ...filters.cliente, nome: e.target.value },
                      })
                    }
                    className="w-full p-2 border rounded-md"
                  />
                </fieldset>

                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">CPF</legend>
                  <input
                    type="text"
                    value={filters.cliente.cpf}
                    onChange={(e) =>
                      handleFilterChange({
                        ...filters,
                        cliente: { ...filters.cliente, cpf: e.target.value },
                      })
                    }
                    className="w-full p-2 border rounded-md"
                  />
                </fieldset>

                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">Status</legend>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange({ ...filters, status: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Selecione</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Entregue">Entregue</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </fieldset>
              </div>

              <div className="flex justify-start items-center gap-6">
                <Button
                  onClick={handleApplyFilters}
                  className="bg-red-600 hover:bg-red-700 text-white w-auto"
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
        </div>
      </div>
    </PadraoPage>
  )
}
