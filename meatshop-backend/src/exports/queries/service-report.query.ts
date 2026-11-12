import type { EntityManager } from 'typeorm';
import type { ExportReportDto } from '../dtos/export-report.dto';
import { column as c, ReportQuery } from './report-query';

export async function supportReport(manager: EntityManager, filters: ExportReportDto) {
  return new ReportQuery(filters, manager)
    .dates('t.created_at')
    .value('t.status::text=?', filters.status)
    .search('t.subject')
    .section(
      'Atendimento',
      [
        c('id', 'Protocolo'),
        c('subject', 'Assunto'),
        c('user', 'Solicitante'),
        c('category', 'Categoria'),
        c('priority', 'Prioridade'),
        c('status', 'Situação'),
        c('created', 'Abertura', 'date'),
        c('closed', 'Encerramento', 'date'),
      ],
      `SELECT t.id,t.subject,u.name AS user,t.category,t.priority,t.status,t.created_at AS created,t.closed_at AS closed FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE t.unit_id=$1`,
      'ORDER BY t.created_at DESC,t.id DESC',
    );
}

export async function reviewsReport(manager: EntityManager, filters: ExportReportDto) {
  const query = new ReportQuery(filters, manager).dates('r.created_at');
  if (filters.product_id === 'unit') query.where('r.product_id IS NULL');
  else if (filters.product_id && filters.product_id !== 'all')
    query.value('r.product_id::text=?', filters.product_id);
  return query.section(
    'Avaliações',
    [
      c('id', 'Avaliação'),
      c('order_id', 'Pedido'),
      c('product', 'Avaliado'),
      c('rating', 'Nota', 'number'),
      c('comment', 'Comentário'),
      c('date', 'Data', 'date'),
    ],
    `SELECT r.id,r.order_id,COALESCE(p.name,'Unidade') AS product,r.rating,r.comment,r.created_at AS date FROM reviews r LEFT JOIN products p ON p.id=r.product_id WHERE r.unit_id=$1`,
    'ORDER BY r.created_at DESC,r.id DESC',
  );
}

export async function deliveriesReport(manager: EntityManager, filters: ExportReportDto) {
  return new ReportQuery(filters, manager)
    .search("concat(u.name,' ',u.email)")
    .section(
      'Entregadores',
      [
        c('name', 'Entregador'),
        c('email', 'E-mail'),
        c('membership', 'Vínculo'),
        c('profile', 'Perfil'),
        c('vehicle', 'Modalidade'),
        c('online', 'Disponibilidade'),
      ],
      `SELECT u.name,u.email,m.status AS membership,COALESCE(d.status::text,'Não cadastrado') AS profile,d.vehicle,CASE WHEN d.is_online THEN 'Online' ELSE 'Offline' END AS online FROM user_units m JOIN users u ON u.id=m.user_id LEFT JOIN delivery_persons d ON d.user_id=u.id WHERE m.unit_id=$1 AND m.local_role='DELIVERY'`,
      'ORDER BY u.name,m.id',
    );
}
