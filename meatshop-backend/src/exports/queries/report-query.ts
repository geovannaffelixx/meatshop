import { BadRequestException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { searchPattern } from '../../common/dtos/panel-list-query.dto';
import type { ExportReportDto } from '../dtos/export-report.dto';
import type { ReportColumn, ReportSection } from '../report.types';

import { queryReportSection } from './query-report-section';
export { MAX_REPORT_ROWS } from './query-report-section';

export class ReportQuery {
  readonly values: unknown[];
  private readonly conditions: string[] = [];
  constructor(
    readonly filters: ExportReportDto,
    private readonly manager: EntityManager,
  ) {
    this.values = [filters.unit_id];
  }

  where(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  value(condition: string, value: unknown): this {
    if (value === undefined || value === '') return this;
    this.values.push(value);
    return this.where(condition.replace('?', `$${this.values.length}`));
  }

  search(expression: string, value = this.filters.search): this {
    return this.value(`${expression} ILIKE ?`, value?.trim() ? searchPattern(value) : undefined);
  }

  dates(expression: string, from = this.filters.date_from, to = this.filters.date_to): this {
    this.value(`${expression} >= (?::date::timestamp AT TIME ZONE 'America/Sao_Paulo')`, from);
    return this.value(
      `${expression} < ((?::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')`,
      to,
    );
  }

  month(expression: string): this {
    if (!this.filters.month) return this;
    this.value(
      `${expression} >= ((? || '-01')::date::timestamp AT TIME ZONE 'America/Sao_Paulo')`,
      this.filters.month,
    );
    return this.value(
      `${expression} < (((? || '-01')::date + INTERVAL '1 month')::timestamp AT TIME ZONE 'America/Sao_Paulo')`,
      this.filters.month,
    );
  }

  async section(
    title: string,
    columns: ReportColumn[],
    sql: string,
    order = '',
  ): Promise<ReportSection> {
    return queryReportSection(
      this.manager,
      title,
      columns,
      `${sql} ${this.conditions.length ? `AND ${this.conditions.join(' AND ')}` : ''} ${order}`,
      this.values,
    );
  }
}

export function validateReportDates(filters: ExportReportDto): void {
  for (const field of ['date_from', 'date_to', 'scheduled_from', 'scheduled_to'] as const) {
    const value = filters[field];
    if (
      value &&
      (Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
    )
      throw new BadRequestException('Informe uma data válida para o relatório.');
  }
  if (
    (filters.date_from && filters.date_to && filters.date_from > filters.date_to) ||
    (filters.scheduled_from &&
      filters.scheduled_to &&
      filters.scheduled_from > filters.scheduled_to)
  )
    throw new BadRequestException('A data inicial deve ser anterior ou igual à data final.');
  if (['finance', 'payments'].includes(filters.report) && !filters.month)
    throw new BadRequestException('Selecione o mês do relatório.');
}

export function column(key: string, label: string, kind?: ReportColumn['kind']): ReportColumn {
  const labels = [
    'status',
    'method',
    'type',
    'discount_type',
    'membership',
    'profile',
    'vehicle',
    'category',
    'outcome',
    'priority',
  ];
  return { key, label, kind: kind ?? (labels.includes(key) ? 'label' : undefined) };
}
