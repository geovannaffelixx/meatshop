import type { EntityManager } from 'typeorm';
import { column as c } from '../../../exports/queries/report-query';
import { queryReportSection } from '../../../exports/queries/query-report-section';
import type { DeliveryExportDto } from '../dtos/delivery-export.dto';
import { deliveryExportRange } from '../delivery-export-range';

export async function deliverySupportReport(
  manager: EntityManager,
  userId: number,
  filters: DeliveryExportDto,
) {
  const values: unknown[] = [userId, ...deliveryExportRange(filters)];
  if (filters.status) values.push(filters.status);
  const condition = `t.user_id=$1 AND t.created_at >= $2 AND t.created_at < $3 ${filters.status ? 'AND t.status::text=$4' : ''}`;
  const tickets = await queryReportSection(
    manager,
    'Meus chamados',
    [
      c('id', 'Protocolo'),
      c('subject', 'Assunto'),
      c('category', 'Categoria'),
      c('status', 'Situação'),
      c('created_at', 'Abertura', 'date'),
      c('closed_at', 'Encerramento', 'date'),
    ],
    `SELECT t.id,t.subject,t.category,t.status,t.created_at,t.closed_at FROM support_tickets t WHERE ${condition} ORDER BY t.created_at DESC,t.id DESC`,
    values,
  );
  const messages = await queryReportSection(
    manager,
    'Mensagens dos chamados',
    [
      c('ticket_id', 'Protocolo'),
      c('sender', 'Remetente'),
      c('message', 'Mensagem'),
      c('created_at', 'Data', 'date'),
    ],
    `SELECT m.ticket_id,CASE WHEN m.sender_id=$1 THEN 'Você' ELSE 'Equipe de suporte' END AS sender,m.message,m.created_at FROM support_messages m JOIN support_tickets t ON t.id=m.ticket_id WHERE ${condition} ORDER BY m.ticket_id,m.created_at,m.id`,
    values,
  );
  return [tickets, messages];
}
