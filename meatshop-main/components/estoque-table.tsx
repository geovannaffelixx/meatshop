"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";

type Produto = {
  id: number;
  descricao: string;
  categoria: string;
  marca: string;
  quantidade: string;
  valor: number;
  status: string;
};

export function EstoqueTable({
  filters,
  currentPage,
  onPageChange,
}: {
  filters: any;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // 🔄 Converte STATUS inglês → português (API -> Tela)
  function mapStatusToPt(status: string): string {
    if (status === "ON_SALE") return "EM PROMOÇÃO";
    if (status === "INACTIVE") return "INATIVO";
    return "ATIVO";
  }

  // 🔎 Buscando lista da API
  useEffect(() => {
    async function loadProducts() {
      try {
        const params = new URLSearchParams();

        if (filters.id) params.append("id", filters.id);
        if (filters.descricao)
          params.append("description", filters.descricao);
        if (filters.categoria)
          params.append("category", filters.categoria);

        if (filters.status) {
          const map: Record<string, string> = {
            "ATIVO": "ACTIVE",
            "INATIVO": "INACTIVE",
            "EM PROMOÇÃO": "ON_SALE",
          };
          params.append(
            "status",
            map[filters.status] ?? filters.status
          );
        }

        params.append("page", String(currentPage));
        params.append("limit", "10");

        const result = await apiGet(`/products?${params.toString()}`);

        const converted = result.data.map((p: any) => ({
          id: p.id,
          descricao: p.name,
          categoria: p.category,
          marca: p.brand ?? "",
          quantidade: p.quantity,
          valor: p.price,
          status: mapStatusToPt(p.status),
        }));

        setProdutos(converted);
        setTotalPages(result.meta.totalPages || 1);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        setProdutos([]);
        setTotalPages(1);
      }
    }

    loadProducts();
  }, [filters, currentPage]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse bg-white rounded-xl overflow-hidden shadow">
        <thead className="bg-gray-200 text-gray-700 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Descrição do produto</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Marca</th>
            <th className="px-4 py-3">Qtd. Disponível (KG)</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => (
            <tr
              key={p.id}
              className="border-b border-gray-200 hover:bg-gray-100 transition"
            >
              <td className="px-4 py-3">{p.id}</td>
              <td className="px-4 py-3 font-semibold">{p.descricao}</td>
              <td className="px-4 py-3">{p.categoria}</td>
              <td className="px-4 py-3">{p.marca}</td>
              <td className="px-4 py-3">{p.quantidade}</td>
              <td className="px-4 py-3">
                R$ {p.valor.toFixed(2).replace(".", ",")}
              </td>
              <td
                className={`px-4 py-3 font-semibold ${
                  p.status === "EM PROMOÇÃO"
                    ? "text-green-600"
                    : p.status === "INATIVO"
                    ? "text-gray-500"
                    : "text-red-700"
                }`}
              >
                {p.status}
              </td>
              <td className="px-4 py-3 text-center">
                <Button
                  onClick={() => router.push(`/estoque/${p.id}`)}
                  className="bg-transparent text-red-600 hover:text-red-800 font-bold underline-offset-2 hover:underline"
                >
                  VER MAIS
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginação */}
      <div className="flex justify-center items-center mt-4 gap-2">
        <Button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded-md"
        >
          {"<"}
        </Button>

        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i + 1)}
            className={`px-3 py-1 rounded-md text-sm font-semibold ${
              currentPage === i + 1
                ? "bg-red-700 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {i + 1}
          </button>
        ))}

        <Button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded-md"
        >
          {">"}
        </Button>
      </div>
    </div>
  );
}
