import type { EntityManager } from 'typeorm';
import { column as c } from '../../../exports/queries/report-query';
import { queryReportSection } from '../../../exports/queries/query-report-section';
import type { DeliveryExportDto } from '../dtos/delivery-export.dto';
import { deliveryExportRange } from '../delivery-export-range';

export async function deliveryEarningsReport(
  manager: EntityManager,
  personId: number,
  filters: DeliveryExportDto,
) {
  const condition =
    filters.payment === 'received'
      ? 'AND s.paid_at IS NOT NULL'
      : filters.payment === 'pending'
        ? 'AND (s.paid_at IS NULL OR s.amount<o.delivery_fee)'
        : '';
  return queryReportSection(
    manager,
    'Ganhos e entregas',
    [
      c('order_id', 'Pedido'),
      c('date', 'Conclusão', 'date'),
      c('amount', 'Taxa de entrega', 'money'),
      c('received', 'Recebido deste pedido', 'money'),
      c('pending', 'A receber', 'money'),
      c('paid_at', 'Data do acerto', 'date'),
    ],
    `SELECT o.id AS order_id,COALESCE(o.delivery_verified_at,o.updated_at) AS date,o.delivery_fee AS amount,COALESCE(s.amount,0) AS received,GREATEST(0,o.delivery_fee-COALESCE(s.amount,0)) AS pending,s.paid_at FROM orders o LEFT JOIN delivery_settlements s ON s.order_id=o.id AND s.delivery_person_id=$1 WHERE o.delivery_person_id=$1 AND o.delivery_status='DELIVERED' AND COALESCE(o.delivery_verified_at,o.updated_at)>=$2 AND COALESCE(o.delivery_verified_at,o.updated_at)<$3 ${condition} ORDER BY date DESC,o.id DESC`,
    [personId, ...deliveryExportRange(filters)],
  );
}

export async function deliveryHistoryReport(
  manager: EntityManager,
  personId: number,
  filters: DeliveryExportDto,
) {
  return queryReportSection(
    manager,
    'Histórico operacional de entregas',
    [
      c('order_id', 'Pedido'),
      c('unit', 'Unidade'),
      c('delivery_type', 'Modalidade', 'label'),
      c('scheduled', 'Agendada'),
      c('pickup_at', 'Retirada confirmada', 'date'),
      c('completed_at', 'Entrega concluída', 'date'),
    ],
    `SELECT o.id AS order_id,u.name AS unit,o.delivery_type,CASE WHEN o.is_scheduled THEN 'Sim' ELSE 'Não' END AS scheduled,o.pickup_verified_at AS pickup_at,COALESCE(o.delivery_verified_at,o.updated_at) AS completed_at FROM orders o JOIN units u ON u.id=o.unit_id WHERE o.delivery_person_id=$1 AND o.delivery_status='DELIVERED' AND COALESCE(o.delivery_verified_at,o.updated_at)>=$2 AND COALESCE(o.delivery_verified_at,o.updated_at)<$3 ORDER BY completed_at DESC,o.id DESC`,
    [personId, ...deliveryExportRange(filters)],
  );
}

export async function deliverySettlementsReport(
  manager: EntityManager,
  personId: number,
  filters: DeliveryExportDto,
) {
  return queryReportSection(
    manager,
    'Acertos recebidos',
    [
      c('order_id', 'Pedido'),
      c('amount', 'Valor recebido', 'money'),
      c('paid_at', 'Pagamento', 'date'),
      c('reference', 'Referência'),
    ],
    'SELECT s.order_id,s.amount,s.paid_at,s.reference FROM delivery_settlements s WHERE s.delivery_person_id=$1 AND s.paid_at >= $2 AND s.paid_at < $3 ORDER BY s.paid_at DESC,s.order_id DESC',
    [personId, ...deliveryExportRange(filters)],
  );
}
