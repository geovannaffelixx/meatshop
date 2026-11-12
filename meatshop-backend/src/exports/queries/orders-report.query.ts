import type { EntityManager } from 'typeorm';
import type { ExportReportDto } from '../dtos/export-report.dto';
import { column as c, ReportQuery } from './report-query';

export async function ordersReport(manager: EntityManager, filters: ExportReportDto) {
  return new ReportQuery(filters, manager)
    .dates('o.order_date')
    .dates('o.scheduled_delivery_date', filters.scheduled_from ?? '', filters.scheduled_to ?? '')
    .search('u.name')
    .search('o.id::text', filters.id)
    .value('o.status::text = ?', filters.status)
    .section(
      'Pedidos',
      [
        c('id', 'Pedido'),
        c('order_date', 'Data', 'date'),
        c('client', 'Cliente'),
        c('status', 'Situação'),
        c('scheduled', 'Agendamento', 'date'),
        c('subtotal', 'Subtotal', 'money'),
        c('discount', 'Desconto', 'money'),
        c('fee', 'Frete', 'money'),
        c('total', 'Total', 'money'),
      ],
      `SELECT o.id,o.order_date,u.name AS client,o.status,o.scheduled_delivery_date AS scheduled,o.subtotal,o.discount_amount AS discount,o.delivery_fee AS fee,o.total_amount AS total FROM orders o JOIN users u ON u.id=o.client_id WHERE o.unit_id=$1`,
      'ORDER BY o.order_date DESC,o.id DESC',
    );
}
