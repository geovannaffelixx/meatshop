'use client';

import Image from 'next/image';
import { useState } from 'react';
import { resolveAssetUrl } from '@/shared/lib/api';

export function UserAvatar({ name, src }: { name: string; src?: string | null }) {
  const url = resolveAssetUrl(src);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
      {url && url !== failedUrl ? (
        <Image unoptimized src={url} alt={`Foto de ${name}`} width={28} height={28}
          className="size-7 object-cover" onError={() => setFailedUrl(url)} />
      ) : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
    </span>
  );
}
