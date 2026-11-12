import { PayloadTooLargeException } from '@nestjs/common';
import type { ReportCell, ReportDocument } from './report.types';

export const MAX_REPORT_SOURCE_BYTES = 8 * 1024 * 1024;
export const MAX_REPORT_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_REPORT_CELL_CHARS = 30_000;

function byteLength(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (value instanceof Date) return Buffer.byteLength(value.toISOString());
  return Buffer.byteLength(String(value), 'utf8');
}

function tooLarge(message: string): never {
  throw new PayloadTooLargeException({ code: 'EXPORT_TOO_LARGE', message });
}

export function assertReportSize(report: ReportDocument): void {
  let bytes = byteLength(report.title) + byteLength(report.generatedAt);
  bytes += report.filters.reduce((total, filter) => total + byteLength(filter), 0);
  bytes += byteLength(report.unit?.name) + byteLength(report.person?.name);

  for (const section of report.sections) {
    bytes += byteLength(section.title);
    bytes += section.columns.reduce(
      (total, column) => total + byteLength(column.key) + byteLength(column.label),
      0,
    );
    for (const row of section.rows) {
      for (const column of section.columns) {
        const value: ReportCell = row[column.key];
        if (typeof value === 'string' && value.length > MAX_REPORT_CELL_CHARS)
          tooLarge(
            'Um dos campos é extenso demais para uma exportação segura. Refine os filtros ou procure o suporte.',
          );
        bytes += byteLength(value);
        if (bytes > MAX_REPORT_SOURCE_BYTES)
          tooLarge(
            'O conteúdo ultrapassa o limite seguro de 8 MB. Refine os filtros ou procure o suporte.',
          );
      }
    }
  }
}

export function assertReportFileSize(buffer: Buffer): void {
  if (buffer.byteLength > MAX_REPORT_FILE_BYTES)
    tooLarge(
      'O arquivo ultrapassa o limite seguro de 25 MB. Refine os filtros ou procure o suporte.',
    );
}
