"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import PageLayout from "@/shared/components/page-layout"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { ProductsTable } from "./products-table"

export function ProductsScreen() {
  const router = useRouter()

  const [filters, setFilters] = useState({
    id: "",
    descricao: "",
    categoria: "",
    status: "",
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

  const handleAddNew = () => {
    router.push("/products/new")
  }

  return (
    <PageLayout title="Estoque" image="/logoClaraEscrita.png">
      <div className="min-h-screen w-full bg-gray-100 bg-[url('/BackgroundClaro.png')] bg-repeat">
        <div className="container mx-auto px-4 py-6 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-red-700 mb-6">Estoque</h2>
          </div>

          {/* Filtros */}
          <Card className="bg-gray/70 backdrop-blur-md rounded-xl shadow p-4 mb-6">
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">Produto</legend>
                  <input
                    type="text"
                    placeholder="ID"
                    value={filters.id}
                    onChange={(e) => handleFilterChange({ ...filters, id: e.target.value })}
                    className="w-full p-2 border rounded-md mb-2"
                  />
                  <input
                    type="text"
                    placeholder="Descrição"
                    value={filters.descricao}
                    onChange={(e) =>
                      handleFilterChange({ ...filters, descricao: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                  />
                </fieldset>

                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">Categoria</legend>
                  <input
                    type="text"
                    value={filters.categoria}
                    onChange={(e) =>
                      handleFilterChange({ ...filters, categoria: e.target.value })
                    }
                    className="w-full p-2 border rounded-md"
                  />
                </fieldset>

                <fieldset className="border p-4 rounded-md">
                  <legend className="text-gray-600 font-medium">Status</legend>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Selecione</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </fieldset>

                <div className="flex items-end">
                  <Button
                    onClick={handleApplyFilters}
                    className="bg-red-600 hover:bg-red-700 text-white w-full"
                  >
                    Localizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botão adicionar */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
            >
              <span className="text-lg">+</span> Adicionar novo produto
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-gray/70 backdrop-blur-md rounded-xl shadow">
            <ProductsTable
              filters={appliedFilters}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
