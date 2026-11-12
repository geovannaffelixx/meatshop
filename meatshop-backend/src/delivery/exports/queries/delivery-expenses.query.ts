import type { EntityManager } from 'typeorm';
import { column as c } from '../../../exports/queries/report-query';
import { queryReportSection } from '../../../exports/queries/query-report-section';
import type { DeliveryExportDto } from '../dtos/delivery-export.dto';
import { deliveryExportRange } from '../delivery-export-range';

export async function deliveryExpensesReport(
  manager: EntityManager,
  userId: number,
  filters: DeliveryExportDto,
) {
  deliveryExportRange(filters);
  const values: unknown[] = [userId, filters.from, filters.to];
  if (filters.category) values.push(filters.category);
  return queryReportSection(
    manager,
    'Despesas pessoais',
    [
      c('date', 'Data'),
      c('category', 'Categoria'),
      c('description', 'Descrição'),
      c('amount', 'Valor', 'money'),
    ],
    `SELECT incurred_on::text AS date,category,description,amount FROM delivery_expenses WHERE user_id=$1 AND incurred_on BETWEEN $2::date AND $3::date ${filters.category ? 'AND category=$4' : ''} ORDER BY incurred_on DESC,id DESC`,
    values,
  );
}
