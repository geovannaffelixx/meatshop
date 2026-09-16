"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { OrdersTable } from "./orders-table"
import { ORDER_STATUS_LABELS } from "../utils/status-labels"
import { PageHeader } from "@/shared/components/page-header"
import { RotateCcw, Search } from "lucide-react"

export function OrdersScreen() {
  const [filters, setFilters] = useState({
    orderDate: { from: "", to: "" },
    scheduledDate: { from: "", to: "" },
    status: "",
    customer: { orderId: "", name: "" },
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

  const clearFilters = () => {
    const emptyFilters = {
      orderDate: { from: "", to: "" },
      scheduledDate: { from: "", to: "" },
      status: "",
      customer: { orderId: "", name: "" },
    }
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
  }

  return (
    <div className="page-surface">
        <div className="page-container">
          <PageHeader
            eyebrow="Operação"
            title="Pedidos"
            description="Localize, confirme e acompanhe os pedidos da unidade."
          />

          <Card className="border-0 bg-white shadow-sm">
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <fieldset className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-700">Data do pedido</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-500">
                      De
                    <input
                      aria-label="Data inicial do pedido"
                      type="date"
                      value={filters.orderDate.from}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          orderDate: { ...filters.orderDate, from: e.target.value },
                        })
                      }
                      className="input mt-1"
                    />
                    </label>
                    <label className="text-xs font-medium text-slate-500">
                      Até
                    <input
                      aria-label="Data final do pedido"
                      type="date"
                      value={filters.orderDate.to}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          orderDate: { ...filters.orderDate, to: e.target.value },
                        })
                      }
                      className="input mt-1"
                    />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-700">Data agendada</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-500">
                      De
                    <input
                      aria-label="Data agendada inicial"
                      type="date"
                      value={filters.scheduledDate.from}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          scheduledDate: { ...filters.scheduledDate, from: e.target.value },
                        })
                      }
                      className="input mt-1"
                    />
                    </label>
                    <label className="text-xs font-medium text-slate-500">
                      Até
                    <input
                      aria-label="Data agendada final"
                      type="date"
                      value={filters.scheduledDate.to}
                      onChange={(e) =>
                        handleFilterChange({
                          ...filters,
                          scheduledDate: { ...filters.scheduledDate, to: e.target.value },
                        })
                      }
                      className="input mt-1"
                    />
                    </label>
                  </div>
                </fieldset>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  ID do pedido
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex.: 1042"
                    value={filters.customer.orderId}
                    onChange={(e) =>
                      handleFilterChange({
                        ...filters,
                        customer: { ...filters.customer, orderId: e.target.value },
                      })
                    }
                    className="input mt-1"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Cliente
                  <input
                    type="text"
                    placeholder="Nome do cliente"
                    value={filters.customer.name}
                    onChange={(e) =>
                      handleFilterChange({
                        ...filters,
                        customer: { ...filters.customer, name: e.target.value },
                      })
                    }
                    className="input mt-1"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange({ ...filters, status: e.target.value })
                    }
                    className="input mt-1"
                  >
                    <option value="">Todos os status</option>
                    {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={clearFilters}>
                  <RotateCcw />
                  Limpar filtros
                </Button>
                <Button
                  onClick={handleApplyFilters}
                >
                  <Search />
                  Aplicar filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <OrdersTable
              filters={appliedFilters}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
          />
        </div>
      </div>
  )
}
