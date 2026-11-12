import type { EntityManager } from 'typeorm';
import type { ExportReportDto } from '../dtos/export-report.dto';
import { column as c, ReportQuery } from './report-query';

export async function catalogReport(manager: EntityManager, filters: ExportReportDto) {
  const query = new ReportQuery(filters, manager)
    .search('p.name')
    .search('cat.name', filters.category)
    .search('p.id::text', filters.id)
    .value('p.active = ?::boolean', filters.active);
  const stock: Record<string, string> = {
    low: 'COALESCE(s.quantity,0)<=COALESCE(s.min_quantity,0)',
    available: 's.quantity>0',
    empty: 'COALESCE(s.quantity,0)<=0',
  };
  if (filters.stock && filters.stock !== 'all') query.where(stock[filters.stock]);
  return query.section(
    'Catálogo e estoque',
    [
      c('id', 'Código'),
      c('name', 'Produto'),
      c('category', 'Categoria'),
      c('brand', 'Marca'),
      c('measure', 'Medida'),
      c('price', 'Preço', 'money'),
      c('quantity', 'Estoque', 'number'),
      c('minimum', 'Mínimo', 'number'),
      c('status', 'Situação'),
    ],
    `SELECT p.id,p.name,cat.name AS category,p.brand,p.unit_of_measure AS measure,p.price,COALESCE(s.quantity,0) AS quantity,COALESCE(s.min_quantity,0) AS minimum,CASE WHEN p.active THEN 'Ativo' ELSE 'Inativo' END AS status FROM products p LEFT JOIN categories cat ON cat.id=p.category_id LEFT JOIN stock s ON s.product_id=p.id WHERE p.unit_id=$1`,
    'ORDER BY p.id',
  );
}

export async function performanceReport(manager: EntityManager, filters: ExportReportDto) {
  return new ReportQuery(filters, manager)
    .dates('o.order_date')
    .search('p.name')
    .search('cat.name', filters.category)
    .search('p.id::text', filters.id)
    .value('p.active=?::boolean', filters.active)
    .section(
      'Desempenho por produto',
      [
        c('id', 'Produto ID'),
        c('name', 'Produto'),
        c('measure', 'Medida'),
        c('orders', 'Pedidos', 'number'),
        c('quantity', 'Quantidade', 'number'),
        c('gross', 'Venda bruta dos itens', 'money'),
      ],
      `SELECT p.id,p.name,p.unit_of_measure AS measure,COUNT(DISTINCT o.id)::int AS orders,SUM(i.quantity) AS quantity,SUM(i.quantity*i.unit_price) AS gross FROM order_items i JOIN orders o ON o.id=i.order_id JOIN products p ON p.id=i.product_id LEFT JOIN categories cat ON cat.id=p.category_id WHERE o.unit_id=$1 AND o.status='DELIVERED' AND EXISTS(SELECT 1 FROM payments pay WHERE pay.order_id=o.id AND pay.status IN ('PAID','PARTIALLY_REFUNDED'))`,
      `GROUP BY p.id ORDER BY gross DESC,p.id`,
    );
}
