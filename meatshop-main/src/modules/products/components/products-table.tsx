"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { apiGet } from "@/shared/lib/api";
import { useManagedUnits } from "@/shared/hooks/use-managed-units";

type Produto = {
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
  descricao: string;
  categoria: string;
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

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;

    setLoading(true);
    apiGet(`/products?unit_id=${unitId}&limit=200`)
      .then((result) => setProdutos(result?.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [unitId]);

  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      const idOk = filters.id ? p.id.toString().includes(filters.id) : true;
      const descricaoOk = filters.descricao
        ? p.name.toLowerCase().includes(filters.descricao.toLowerCase())
        : true;
      const categoriaOk = filters.categoria
        ? (p.category_name ?? "").toLowerCase().includes(filters.categoria.toLowerCase())
        : true;
      const statusOk = filters.status
        ? (filters.status === "ATIVO") === p.active
        : true;

      return idOk && descricaoOk && categoriaOk && statusOk;
    });
  }, [filters, produtos]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * itemsPerPage;
  const pageData = filtered.slice(start, start + itemsPerPage);

  if (loading) {
    return <div className="p-4 text-gray-500 italic">Carregando produtos...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600 font-semibold">Erro: {error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse bg-white rounded-xl overflow-hidden shadow">
        <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Descrição do produto</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Marca</th>
            <th className="px-4 py-3">Qtd. em estoque</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {pageData.length > 0 ? (
            pageData.map((p) => (
              <tr
                key={p.id}
                className="border-b border-gray-200 hover:bg-gray-100 transition"
              >
                <td className="px-4 py-3">{p.id}</td>
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="px-4 py-3">{p.category_name ?? "-"}</td>
                <td className="px-4 py-3">{p.brand ?? "-"}</td>
                <td className="px-4 py-3">
                  {p.stock_quantity} {p.unit_of_measure}
                  {p.stock_quantity <= p.stock_min_quantity && (
                    <span className="ml-1 text-amber-600 font-semibold">⚠</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  R$ {p.price.toFixed(2).replace(".", ",")}
                </td>
                <td
                  className={`px-4 py-3 font-semibold ${
                    p.active ? "text-red-700" : "text-gray-500"
                  }`}
                >
                  {p.active ? "ATIVO" : "INATIVO"}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    onClick={() => router.push(`/products/${p.id}`)}
                    className="bg-transparent text-red-600 hover:text-red-800 font-bold underline-offset-2 hover:underline"
                  >
                    VER MAIS
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="text-center p-4 text-gray-500 italic">
                Nenhum produto encontrado com os filtros aplicados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-center items-center mt-4 gap-2">
        <Button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={safePage === 1}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded-md"
        >
          {"<"}
        </Button>

        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i + 1)}
            className={`px-3 py-1 rounded-md text-sm font-semibold ${
              safePage === i + 1
                ? "bg-red-700 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {i + 1}
          </button>
        ))}

        <Button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={safePage === totalPages}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded-md"
        >
          {">"}
        </Button>
      </div>
    </div>
  );
}
