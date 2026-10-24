'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/lib/api';
import { apiQueryKey, canCacheApiPath, panelQueryClient } from '@/shared/lib/query-cache';

export function useApiQuery<T>(path: string | null, options?: { refetchInterval?: number }) {
  return useQuery<T, Error>({
    queryKey: apiQueryKey(path ?? ''),
    queryFn: ({ signal }) => apiGet(path!, { signal, cache: false }),
    enabled: path !== null,
    staleTime: path && canCacheApiPath(path) ? 120_000 : 0,
    gcTime: path && canCacheApiPath(path) ? 600_000 : 0,
    refetchOnMount: path && canCacheApiPath(path) ? true : 'always',
    refetchInterval: options?.refetchInterval,
  }, panelQueryClient);
}
