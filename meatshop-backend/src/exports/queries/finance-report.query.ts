import type { EntityManager } from 'typeorm';
import type { ExportReportDto } from '../dtos/export-report.dto';
import { column as c, ReportQuery } from './report-query';

export async function financeDetails(manager: EntityManager, filters: ExportReportDto) {
  const expenses = await new ReportQuery(filters, manager)
    .value(`COALESCE(e."paidAt",e."postedAt") LIKE ?`, `${filters.month}-%`)
    .section(
      'Despesas',
      [
        c('supplier', 'Fornecedor'),
        c('type', 'Tipo'),
        c('amount', 'Valor', 'money'),
        c('discount', 'Desconto', 'money'),
        c('paid', 'Pago', 'money'),
        c('date', 'Data'),
        c('method', 'Forma'),
      ],
      `SELECT e."supplierName" AS supplier,e.type,e.amount,e.discount,e."paidAmount" AS paid,COALESCE(e."paidAt",e."postedAt") AS date,e."paymentMethod" AS method FROM expenses e WHERE e.unit_id=$1`,
      'ORDER BY date,e.id',
    );
  const settlements = await new ReportQuery(filters, manager)
    .month('s.paid_at')
    .section(
      'Acertos de entregas',
      [
        c('order_id', 'Pedido'),
        c('name', 'Entregador'),
        c('amount', 'Pago', 'money'),
        c('date', 'Pagamento', 'date'),
        c('reference', 'Referência'),
      ],
      `SELECT s.order_id,u.name,s.amount,s.paid_at AS date,s.reference FROM delivery_settlements s JOIN orders o ON o.id=s.order_id JOIN delivery_persons d ON d.id=s.delivery_person_id JOIN users u ON u.id=d.user_id WHERE o.unit_id=$1`,
      'ORDER BY s.paid_at,s.order_id',
    );
  return [expenses, settlements];
}
