import type { EntityManager } from 'typeorm';
import { PAYMENT_VIEWS } from '../../payments/payment-list.policy';
import type { ExportReportDto } from '../dtos/export-report.dto';
import { column as c, ReportQuery } from './report-query';

export async function paymentsReport(manager: EntityManager, filters: ExportReportDto) {
  return new ReportQuery(filters, manager)
    .month('o.order_date')
    .dates('o.order_date')
    .where(`(${PAYMENT_VIEWS[filters.view ?? 'all']})`)
    .value('p.status::text=?', filters.status)
    .section(
      'Pagamentos',
      [
        c('id', 'Pedido'),
        c('date', 'Data do pedido', 'date'),
        c('method', 'Forma'),
        c('status', 'Situação'),
        c('total', 'Valor do pedido', 'money'),
        c('refunded', 'Estornado', 'money'),
        c('fees', 'Taxas', 'money'),
        c('net', 'Líquido recebido', 'money'),
        c('paid_at', 'Recebimento', 'date'),
        c('delivery_paid_at', 'Acerto entregador', 'date'),
      ],
      `SELECT o.id,o.order_date AS date,p.method,p.status,o.total_amount AS total,p.refunded_amount AS refunded,p.fee_amount AS fees,CASE WHEN p.status IN ('PAID','PARTIALLY_REFUNDED') THEN GREATEST(0,o.total_amount-p.refunded_amount-p.fee_amount) ELSE 0 END AS net,p.payment_date AS paid_at,s.paid_at AS delivery_paid_at FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN delivery_settlements s ON s.order_id=o.id WHERE o.unit_id=$1`,
      'ORDER BY o.id DESC',
    );
}
