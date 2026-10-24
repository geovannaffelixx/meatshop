'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { DataSkeleton } from '@/shared/components/data-skeleton';
import { useApiQuery } from '@/shared/hooks/use-api-query';
import { resolveAssetUrl } from '@/shared/lib/api';
import { formatCurrency } from '@/shared/lib/formatters';
import { Button } from '@/shared/components/ui/button';

type ProductDetails = {
  product: { name: string; description?: string; price: number; active: boolean; brand?: string; unit_of_measure: string; image_url?: string; category?: { name: string } };
  stock: { quantity: number; min_quantity: number } | null;
  images: { id: number; image_url: string }[];
};

export function ProductDetailsDialog({ productId, onClose }: { productId: number; onClose: () => void }) {
  const query = useApiQuery<ProductDetails>(`/products/manage/${productId}`);
  const [selected, setSelected] = useState(0);
  const data = query.data;
  const images = [...new Set([data?.product.image_url, ...(data?.images ?? []).map(image => image.image_url)].filter((url): url is string => Boolean(url)))];
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{data?.product.name ?? 'Detalhes do produto'}</DialogTitle><DialogDescription>Imagens e informações do catálogo e estoque.</DialogDescription></DialogHeader>
        {query.isPending ? <DataSkeleton variant="form" label="Carregando produto..." /> : query.error ? (
          <div role="alert" className="space-y-3 text-sm text-red-700"><p>Não foi possível carregar o produto.</p><Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button></div>
        ) : data && <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border bg-slate-50">
              {images.length ? <Image unoptimized src={resolveAssetUrl(images[selected] ?? images[0])} alt={data.product.name} width={500} height={500} className="size-full object-contain" /> : <div className="text-center text-slate-400"><Package className="mx-auto mb-2 size-12" /><p className="text-sm">Sem imagens cadastradas</p></div>}
            </div>
            {images.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">{images.map((url, index) => <button key={url} type="button" aria-label={`Ver imagem ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)} className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 focus-visible:outline-red-600 ${selected === index ? 'border-red-600' : 'border-slate-200'}`}><Image unoptimized src={resolveAssetUrl(url)} alt="" width={64} height={64} className="size-full object-cover" /></button>)}</div>}
          </div>
          <div className="space-y-5">
            <div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.product.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{data.product.active ? 'Ativo' : 'Inativo'}</span><p className="mt-4 text-3xl font-bold text-slate-950">{formatCurrency(data.product.price)}<span className="ml-1 text-sm font-normal text-slate-500">/ {data.product.unit_of_measure}</span></p></div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{data.product.description || 'Sem descrição cadastrada.'}</p>
            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">{[
              ['Categoria', data.product.category?.name ?? '—'], ['Marca', data.product.brand ?? '—'],
              ['Em estoque', `${data.stock?.quantity ?? 0} ${data.product.unit_of_measure}`], ['Estoque mínimo', `${data.stock?.min_quantity ?? 0} ${data.product.unit_of_measure}`],
            ].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd></div>)}</dl>
          </div>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
