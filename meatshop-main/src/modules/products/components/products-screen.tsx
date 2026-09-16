"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { ProductsTable } from "./products-table"
import { PageHeader } from "@/shared/components/page-header"
import { Plus, RotateCcw, Search } from "lucide-react"

export function ProductsScreen() {
  const router = useRouter()

  const [filters, setFilters] = useState({
    id: "",
    name: "",
    category: "",
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

  const clearFilters = () => {
    const emptyFilters = { id: "", name: "", category: "", status: "" }
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
  }

  return (
    <div className="page-surface">
        <div className="page-container">
          <PageHeader
            eyebrow="Catálogo"
            title="Produtos e estoque"
            description="Gerencie o catálogo, os preços e a disponibilidade dos produtos."
            actions={
              <Button onClick={handleAddNew}>
                <Plus />
                Novo produto
              </Button>
            }
          />

          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm font-medium text-slate-700">
                  ID do produto
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex.: 42"
                    value={filters.id}
                    onChange={(e) => handleFilterChange({ ...filters, id: e.target.value })}
                    className="input mt-1"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Nome do produto
                  <input
                    type="text"
                    placeholder="Ex.: Picanha"
                    value={filters.name}
                    onChange={(e) =>
                      handleFilterChange({ ...filters, name: e.target.value })
                    }
                    className="input mt-1"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Categoria
                  <input
                    type="text"
                    placeholder="Nome da categoria"
                    value={filters.category}
                    onChange={(e) =>
                      handleFilterChange({ ...filters, category: e.target.value })
                    }
                    className="input mt-1"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                    className="input mt-1"
                  >
                    <option value="">Todos os status</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={clearFilters}>
                  <RotateCcw />
                  Limpar filtros
                </Button>
                <Button onClick={handleApplyFilters}>
                  <Search />
                  Aplicar filtros
                </Button>
              </div>
            </CardContent>
          </Card>

            <ProductsTable
              filters={appliedFilters}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
        </div>
      </div>
  )
}
