import type { UnitReport } from '../../exports/report.types';
import { column as c } from '../../exports/queries/report-query';
import type { ExportAuditLogDto } from '../dtos/export-audit-log.dto';
import type { AuditLog } from '../entities/audit-log.entity';

const columns = [
  c('id', 'Evento'),
  c('date', 'Data', 'date'),
  c('outcome', 'Resultado'),
  c('action', 'Ação'),
  c('entity', 'Recurso'),
  c('entity_id', 'ID recurso'),
  c('user', 'Responsável'),
  c('description', 'Descrição'),
  c('correlation', 'Correlação'),
];

export function buildAuditReport(
  logs: AuditLog[],
  unit: UnitReport['unit'],
  filters: ExportAuditLogDto,
): UnitReport {
  const rows = logs.map((log) => ({
    id: log.id,
    date: log.created_at,
    outcome: log.outcome,
    action: log.action,
    entity: log.entity,
    entity_id: log.entity_id,
    user: log.user?.name ?? 'Sistema',
    description: log.description,
    correlation: log.correlation_id,
  }));
  return {
    title: 'Auditoria',
    unit: { id: unit.id, name: unit.name },
    generatedAt: new Date(),
    filters: [
      `Busca: ${filters.search ?? 'Todas'}`,
      `Resultado: ${filters.outcome ?? 'Todos'}`,
      `De: ${filters.date_from ?? 'Início'} até ${filters.date_to ?? 'Agora'}`,
    ],
    sections: [{ title: 'Eventos', columns, rows }],
  };
}
