"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/shared/lib/api";
import { useManagedUnits } from "@/shared/hooks/use-managed-units";
import { DataPagination } from "@/shared/components/data-pagination";
import { formatCurrency } from "@/shared/lib/formatters";
import { AlertTriangle } from "lucide-react";

type Product = {
  id: number;
  name: string;
  category_name: string | null;
  brand: string | null;
  unit_of_measure: string;
  price: number;
  active: boolean;
  stock_quantity: number;
  stock_min_quantity: number;
};

type Filters = {
  id: string;
  name: string;
  category: string;
  status: string;
};

export function ProductsTable({
  filters,
  currentPage,
  onPageChange,
}: {
  filters: Filters;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();
  const { unitId } = useManagedUnits();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;

    setLoading(true);
    apiGet(`/products?unit_id=${unitId}&limit=200`)
      .then((result) => setProducts(result?.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [unitId]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const idOk = filters.id ? p.id.toString().includes(filters.id) : true;
      const nameMatches = filters.name
        ? p.name.toLowerCase().includes(filters.name.toLowerCase())
        : true;
      const categoryMatches = filters.category
        ? (p.category_name ?? "").toLowerCase().includes(filters.category.toLowerCase())
        : true;
      const statusMatches = filters.status
        ? (filters.status === "ATIVO") === p.active
        : true;

      return idOk && nameMatches && categoryMatches && statusMatches;
    });
  }, [filters, products]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * itemsPerPage;
  const pageData = filtered.slice(start, start + itemsPerPage);

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Carregando produtos...</div>;
  }
  if (error) {
    return <div className="p-10 text-center font-semibold text-red-700">{error}</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
      <table className="data-table">
        <caption className="sr-only">Produtos e níveis de estoque</caption>
        <thead>
          <tr>
            <th scope="col">Produto</th>
            <th scope="col">Categoria</th>
            <th scope="col">Marca</th>
            <th scope="col">Estoque</th>
            <th scope="col">Preço</th>
            <th scope="col">Status</th>
            <th scope="col" className="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {pageData.length > 0 ? (
            pageData.map((p) => (
              <tr
                key={p.id}
                onClick={() => router.push(`/products/${p.id}`)}
                className="cursor-pointer"
              >
                <td>
                  <span className="block font-semibold text-slate-900">{p.name}</span>
                  <span className="text-xs text-slate-500">#{p.id}</span>
                </td>
                <td>{p.category_name ?? "—"}</td>
                <td>{p.brand ?? "—"}</td>
                <td>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {p.stock_quantity} {p.unit_of_measure}
                  {p.stock_quantity <= p.stock_min_quantity && (
                      <span title="Estoque abaixo do mínimo" aria-label="Estoque abaixo do mínimo" className="text-amber-700">
                        <AlertTriangle className="size-4" />
                      </span>
                  )}
                  </span>
                </td>
                <td className="whitespace-nowrap font-medium">{formatCurrency(p.price)}</td>
                <td>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/products/${p.id}`);
                    }}
                    className="font-semibold text-red-700 hover:underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="p-10 text-center text-slate-500">
                Nenhum produto encontrado com os filtros aplicados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <DataPagination
        page={safePage}
        pageSize={itemsPerPage}
        totalItems={filtered.length}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
