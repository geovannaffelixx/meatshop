import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

type DataPaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function DataPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: DataPaginationProps) {
  const safePage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const firstItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastItem = Math.min(safePage * pageSize, totalItems);

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        {firstItem}–{lastItem} de {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <span className="min-w-20 text-center font-medium text-slate-800">
          {safePage} de {Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Próxima página"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
