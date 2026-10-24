'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { apiDelete, apiUpload, resolveAssetUrl } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';

type UnitImagesProps = { unitId: number; logo?: string | null; cover?: string | null; gallery: string[]; onSaved: () => Promise<void> };

export function UnitImages({ unitId, logo, cover, gallery, onSaved }: UnitImagesProps) {
  const [busy, setBusy] = useState(false);
  async function upload(kind: 'logo' | 'cover' | 'images', files: File[]) {
    if (!files.length || busy) return;
    if (files.some(file => file.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))) {
      toast.warning('Envie imagens JPG, PNG, WebP ou GIF de até 2 MB cada.'); return;
    }
    if (kind === 'images' && gallery.length + files.length > 10) { toast.warning('A galeria permite até 10 fotos.'); return; }
    const body = new FormData();
    files.forEach(file => body.append(kind === 'images' ? 'files' : 'file', file));
    setBusy(true);
    try {
      await apiUpload(`/units/${unitId}/${kind}`, body);
      await onSaved();
      toast.success('Imagens da unidade atualizadas.');
    } catch { toast.error('Não foi possível enviar as imagens. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function remove(url: string) {
    setBusy(true);
    try { await apiDelete(`/units/${unitId}/images?url=${encodeURIComponent(url)}`); await onSaved(); toast.success('Foto removida.'); }
    catch { toast.error('Não foi possível remover a foto.'); }
    finally { setBusy(false); }
  }
  const picker = (kind: 'logo' | 'cover' | 'images', text: string) => <label className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus-within:ring-2 focus-within:ring-red-500 ${busy ? 'opacity-50' : 'cursor-pointer hover:border-red-200 hover:text-red-700'}`}>
    <ImagePlus className="size-4" />{text}<input type="file" aria-label={text} accept="image/jpeg,image/png,image/webp,image/gif" multiple={kind === 'images'} disabled={busy} className="sr-only"
      onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void upload(kind, files); }} />
  </label>;
  return <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-busy={busy}>
    <div><h2 className="text-lg font-semibold text-slate-900">Imagens da unidade</h2><p className="mt-1 text-sm text-slate-500">Logo para identificação, capa para a vitrine e fotos do açougue. Até 2 MB por imagem.</p></div>
    <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
      <div className="space-y-3"><div className="grid size-24 place-items-center overflow-hidden rounded-2xl border bg-slate-50">{logo ? <Image unoptimized src={resolveAssetUrl(logo)} alt="Logo da unidade" width={96} height={96} className="size-full object-contain" /> : <ImagePlus className="size-7 text-slate-300" />}</div>{picker('logo', 'Alterar logo')}</div>
      <div className="space-y-3"><div className="grid aspect-[3/1] max-h-48 place-items-center overflow-hidden rounded-2xl border bg-slate-50">{cover ? <Image unoptimized src={resolveAssetUrl(cover)} alt="Capa da unidade" width={900} height={300} className="size-full object-cover" /> : <p className="p-4 text-center text-sm text-slate-400">Adicione uma foto para a capa</p>}</div>{picker('cover', cover ? 'Alterar capa' : 'Adicionar capa')}</div>
    </div>
    <div className="space-y-4 border-t pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-800">Galeria do açougue</h3><p className="text-sm text-slate-500">{gallery.length} de 10 fotos</p></div>{gallery.length < 10 && picker('images', 'Adicionar fotos')}</div>
      {gallery.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{gallery.map((url, index) => <div key={url} className="relative overflow-hidden rounded-xl border"><Image unoptimized src={resolveAssetUrl(url)} alt={`Foto ${index + 1} da unidade`} width={240} height={180} className="aspect-[4/3] w-full object-cover" /><button type="button" disabled={busy} aria-label={`Remover foto ${index + 1}`} onClick={() => void remove(url)} className="absolute right-2 top-2 rounded-lg bg-white p-2 text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-4" /></button></div>)}</div> : <p className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-400">Mostre o ambiente, o balcão e a fachada da unidade.</p>}
    </div>
    {busy && <p role="status" className="text-sm text-red-700">Atualizando imagens...</p>}
  </section>;
}
