'use client';

import { useState } from 'react';

export function useTablePagination<T>(data: T[], resetKey: string, pageSize = 10) {
  const [selection, setSelection] = useState({ key: resetKey, page: 1 });
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const page = selection.key === resetKey ? Math.min(selection.page, totalPages) : 1;
  return {
    page,
    pageSize,
    totalItems: data.length,
    totalPages,
    pageData: data.slice((page - 1) * pageSize, page * pageSize),
    onPageChange: (next: number) => setSelection({ key: resetKey, page: Math.min(Math.max(next, 1), totalPages) }),
  };
}
