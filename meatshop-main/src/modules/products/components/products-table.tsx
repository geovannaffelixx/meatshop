"use client";

import { useApiQuery } from "@/shared/hooks/use-api-query";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { useManagedUnits } from "@/shared/hooks/use-managed-units";
import { ReusableTable, type TableColumn } from "@/shared/components/reusable-table";
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

  const query = useApiQuery<{ data: Product[] }>(unitId ? `/products/manage?unit_id=${unitId}&limit=200` : null);
  const products = useMemo(() => query.data?.data ?? [], [query.data]);
  const loading = query.isPending;
  const error = query.error?.message;

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
    return <DataSkeleton label="Carregando produtos..." />;
  }
  if (error) {
    return <div className="p-10 text-center font-semibold text-red-700">{error}</div>;
  }

  const columns: TableColumn<Product>[] = [
    { id: 'name', header: 'Produto', accessor: product => <><span className="block font-semibold text-slate-900">{product.name}</span><span className="text-xs text-slate-500">#{product.id}</span></> },
    { id: 'category', header: 'Categoria', accessor: product => product.category_name ?? '—' },
    { id: 'brand', header: 'Marca', accessor: product => product.brand ?? '—' },
    { id: 'stock', header: 'Estoque', accessor: product => <span className="flex items-center gap-1.5 whitespace-nowrap">{product.stock_quantity} {product.unit_of_measure}{product.stock_quantity <= product.stock_min_quantity && <span title="Estoque abaixo do mínimo" aria-label="Estoque abaixo do mínimo" className="text-amber-700"><AlertTriangle className="size-4" /></span>}</span> },
    { id: 'price', header: 'Preço', accessor: product => formatCurrency(product.price), className: 'whitespace-nowrap font-medium' },
    { id: 'status', header: 'Status', accessor: product => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{product.active ? 'Ativo' : 'Inativo'}</span> },
    { id: 'actions', header: 'Ações', textAlign: 'end', accessor: product => <button type="button" onClick={() => router.push(`/products/${product.id}`)} className="font-semibold text-red-700 hover:underline">Editar</button> },
  ];

  return <ReusableTable data={pageData} columns={columns} caption="Produtos e níveis de estoque" keyExtractor={product => product.id}
    onRowClick={product => router.push(`/products/${product.id}`)} emptyMessage="Nenhum produto encontrado com os filtros aplicados."
    footer={<DataPagination page={safePage} pageSize={itemsPerPage} totalItems={filtered.length} totalPages={totalPages} onPageChange={onPageChange} />} />;
}
