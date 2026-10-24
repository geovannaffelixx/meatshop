'use client';

import { useEffect, useState } from 'react';
import { useApiQuery } from '@/shared/hooks/use-api-query';

export type PageResult<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };
export const PAGE_SIZE = 10;

export function useServerList<T>(path: string | null, search = '', filters: Record<string, string> = {}) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({ search: debouncedSearch, limit: String(PAGE_SIZE), paginated: 'true' });
  Object.entries(filters).forEach(([name, value]) => { if (value) params.set(name, value); });
  const key = `${path}:${params}`;
  const [selection, setSelection] = useState({ key, page: 1 });
  const page = selection.key === key ? selection.page : 1;
  params.set('page', String(page));
  const query = useApiQuery<PageResult<T>>(path ? `${path}${path.includes('?') ? '&' : '?'}${params}` : null);
  const totalPages = query.data?.meta.totalPages ?? 1;
  useEffect(() => {
    if (query.data && page > totalPages) setSelection({ key, page: totalPages });
  }, [key, page, totalPages, query.data]);
  return {
    ...query,
    rows: query.data?.data ?? [],
    pagination: { page, pageSize: PAGE_SIZE, totalItems: query.data?.meta.total ?? 0, totalPages,
      onPageChange: (next: number) => setSelection({ key, page: next }) },
  };
}
