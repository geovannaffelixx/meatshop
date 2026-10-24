"use client";

import { useApiQuery } from "@/shared/hooks/use-api-query";

import { DataSkeleton } from "@/shared/components/data-skeleton";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useManagedUnits } from "@/shared/hooks/use-managed-units";
import { ReusableTable, type TableColumn } from "@/shared/components/reusable-table";
import type { PageResult } from "@/shared/hooks/use-server-list";
import { ProductDetailsDialog } from "./product-details-dialog";
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

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const params = new URLSearchParams({ unit_id: String(unitId), page: String(currentPage), limit: '10', search: filters.name, category: filters.category, id: filters.id });
  if (filters.status) params.set('active', String(filters.status === 'ATIVO'));
  const query = useApiQuery<PageResult<Product>>(unitId ? `/products/manage?${params}` : null);
  const loading = query.isPending;
  const error = query.error?.message;
  const totalPages = query.data?.meta.totalPages ?? 1;
  useEffect(() => {
    if (query.data && currentPage > totalPages) onPageChange(totalPages);
  }, [currentPage, onPageChange, query.data, totalPages]);
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

  return <><ReusableTable data={query.data?.data ?? []} columns={columns} caption="Produtos e níveis de estoque" keyExtractor={product => product.id}
    onRowClick={product => setSelectedProductId(product.id)} emptyMessage="Nenhum produto encontrado com os filtros aplicados."
    footer={<DataPagination page={currentPage} pageSize={10} totalItems={query.data?.meta.total ?? 0} totalPages={totalPages} onPageChange={onPageChange} />} />
    {selectedProductId !== null && <ProductDetailsDialog key={selectedProductId} productId={selectedProductId} onClose={() => setSelectedProductId(null)} />}
  </>;
}
