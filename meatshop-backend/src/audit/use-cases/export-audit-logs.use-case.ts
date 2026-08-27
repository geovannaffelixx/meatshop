import { Injectable } from '@nestjs/common';
import { FilterAuditLogDto } from '../dtos/filter-audit-log.dto';
import { AuditLog } from '../entities/audit-log.entity';
import { ListAuditLogsUseCase } from './list-audit-logs.use-case';

@Injectable()
export class ExportAuditLogsUseCase {
  constructor(private readonly listAuditLogs: ListAuditLogsUseCase) {}
  async execute(filters: FilterAuditLogDto): Promise<string> {
    const logs = await this.listAuditLogs.buildQuery(filters).take(10000).getMany();
    const header = [
      'id',
      'data_hora',
      'resultado',
      'acao',
      'entidade',
      'entidade_id',
      'usuario',
      'unidade',
      'descricao',
      'correlacao',
    ];
    return [header, ...logs.map((log) => this.toRow(log))]
      .map((row) => row.map(this.escape).join(';'))
      .join('\n');
  }

  private toRow(log: AuditLog): Array<string | number | null | undefined> {
    return [
      log.id,
      log.created_at.toISOString(),
      log.outcome,
      log.action,
      log.entity,
      log.entity_id,
      log.user?.name,
      log.unit?.name,
      log.description,
      log.correlation_id,
    ];
  }

  private escape(value: unknown): string {
    const safe = String(value ?? '')
      .replace(/^[=+\-@]/, "'$&")
      .replace(/"/g, '""');
    return `"${safe}"`;
  }
}
