'use client';

import Image from 'next/image';
import { useState } from 'react';
import { resolveAssetUrl } from '@/shared/lib/api';

export function UserAvatar({ name, src, size = 'sm' }: { name: string; src?: string | null; size?: 'sm' | 'lg' }) {
  const url = resolveAssetUrl(src);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 font-semibold text-slate-600 ${size === 'lg' ? 'size-16 text-xl' : 'size-7 text-xs'}`}>
      {url && url !== failedUrl ? (
        <Image unoptimized src={url} alt={`Foto de ${name}`} width={size === 'lg' ? 64 : 28} height={size === 'lg' ? 64 : 28}
          className="size-full object-cover" onError={() => setFailedUrl(url)} />
      ) : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
    </span>
  );
}
