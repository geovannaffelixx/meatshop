import { PayloadTooLargeException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ReportCell, ReportColumn, ReportSection } from '../report.types';
import { MAX_REPORT_SOURCE_BYTES } from '../report-size';

export const MAX_REPORT_ROWS = 10000;

export async function queryReportSection(
  manager: EntityManager,
  title: string,
  columns: ReportColumn[],
  sql: string,
  values: unknown[],
): Promise<ReportSection> {
  const [stats]: { row_count?: string | number; byte_count?: string | number }[] =
    await manager.query(
      `SELECT COUNT(*) AS row_count,COALESCE(SUM(pg_column_size(report_row)),0) AS byte_count FROM (${sql} LIMIT ${MAX_REPORT_ROWS + 1}) report_row`,
      values,
    );
  if (Number(stats?.row_count ?? 0) > MAX_REPORT_ROWS)
    throw new PayloadTooLargeException({
      code: 'EXPORT_TOO_LARGE',
      message: 'Este relatório tem mais de 10 mil registros. Reduza o período ou use mais filtros.',
    });
  if (Number(stats?.byte_count ?? 0) > MAX_REPORT_SOURCE_BYTES)
    throw new PayloadTooLargeException({
      code: 'EXPORT_TOO_LARGE',
      message:
        'O conteúdo ultrapassa o limite seguro de 8 MB. Reduza o período ou use mais filtros.',
    });
  const rows: Record<string, ReportCell>[] = await manager.query(
    `${sql} LIMIT ${MAX_REPORT_ROWS + 1}`,
    values,
  );
  if (rows.length > MAX_REPORT_ROWS)
    throw new PayloadTooLargeException({
      code: 'EXPORT_TOO_LARGE',
      message: 'Este relatório tem mais de 10 mil registros. Reduza o período ou use mais filtros.',
    });
  for (const row of rows)
    for (const column of columns) {
      if (row[column.key] !== null && (column.kind === 'money' || column.kind === 'number'))
        row[column.key] = Number(row[column.key] ?? 0);
    }
  return { title, columns, rows };
}
