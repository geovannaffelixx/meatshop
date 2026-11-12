import type { EntityManager } from 'typeorm';
import type { ExportReportDto } from '../dtos/export-report.dto';
import { column as c, ReportQuery } from './report-query';

export async function couponsReport(manager: EntityManager, filters: ExportReportDto) {
  return new ReportQuery(filters, manager)
    .search("concat(c.code,' ',c.name)")
    .value('c.active=?::boolean', filters.active)
    .section(
      'Cupons',
      [
        c('code', 'Código'),
        c('name', 'Nome'),
        c('type', 'Abrangência'),
        c('discount_type', 'Tipo desconto'),
        c('discount', 'Desconto', 'number'),
        c('starts', 'Início', 'date'),
        c('expires', 'Fim', 'date'),
        c('uses', 'Usos na unidade', 'number'),
        c('discounts', 'Descontos na unidade', 'money'),
      ],
      `SELECT c.code,c.name,c.type,c.discount_type,c.discount_amount AS discount,c.starts_at AS starts,c.expires_at AS expires,(SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id=c.id AND r.unit_id=$1 AND r.status='REDEEMED') AS uses,(SELECT COALESCE(SUM(r.discount_amount),0) FROM coupon_redemptions r WHERE r.coupon_id=c.id AND r.unit_id=$1 AND r.status='REDEEMED') AS discounts FROM coupons c WHERE (c.unit_id=$1 OR (c.type='PLATFORM' AND (NOT EXISTS(SELECT 1 FROM coupon_units cu WHERE cu.coupon_id=c.id) OR EXISTS(SELECT 1 FROM coupon_units cu WHERE cu.coupon_id=c.id AND cu.unit_id=$1))))`,
      'ORDER BY c.created_at DESC,c.id DESC',
    );
}

export async function promotionsReport(manager: EntityManager, filters: ExportReportDto) {
  const query = new ReportQuery(filters, manager).search("concat(m.title,' ',p.name)");
  const states: Record<string, string> = {
    Ativa: 'm.active AND m.starts_at<=NOW() AND m.ends_at>=NOW()',
    Agendada: 'm.active AND m.starts_at>NOW()',
    Expirada: 'm.active AND m.ends_at<NOW()',
    Inativa: 'NOT m.active',
  };
  if (filters.status && states[filters.status]) query.where(states[filters.status]);
  return query.section(
    'Promoções',
    [
      c('title', 'Promoção'),
      c('product', 'Produto'),
      c('starts', 'Início', 'date'),
      c('ends', 'Fim', 'date'),
      c('discount', 'Desconto (%)', 'number'),
      c('price', 'Preço promocional', 'money'),
      c('status', 'Situação'),
    ],
    `SELECT m.title,p.name AS product,m.starts_at AS starts,m.ends_at AS ends,m.discount_percentage AS discount,COALESCE(m.promotional_price,ROUND(p.price*(1-COALESCE(m.discount_percentage,0)/100),2)) AS price,CASE WHEN NOT m.active THEN 'Inativa' WHEN m.starts_at>NOW() THEN 'Agendada' WHEN m.ends_at<NOW() THEN 'Encerrada' ELSE 'Ativa' END AS status FROM promotions m JOIN products p ON p.id=m.product_id WHERE m.unit_id=$1`,
    'ORDER BY m.created_at DESC,m.id DESC',
  );
}
