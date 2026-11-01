import { buildAuditReport } from '../utils/build-audit-report';
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ReportAccessService } from '../../exports/report-access.service';
import { ReportFileService } from '../../exports/report-file.service';
import { MAX_REPORT_ROWS } from '../../exports/queries/report-query';
import { User } from '../../users/entities/user.entity';
import { AuditTrailService } from '../audit-trail.service';
import { AuditOutcome } from '../entities/audit-log.entity';
import { ExportAuditLogDto } from '../dtos/export-audit-log.dto';
import { ListAuditLogsUseCase } from './list-audit-logs.use-case';

@Injectable()
export class ExportAuditLogsUseCase {
  private readonly logger = new Logger(ExportAuditLogsUseCase.name);
  constructor(
    private readonly list: ListAuditLogsUseCase,
    private readonly access: ReportAccessService,
    private readonly files: ReportFileService,
    private readonly audit: AuditTrailService,
  ) {}

  async execute(filters: ExportAuditLogDto, user: User) {
    try {
      const unit = await this.access.assert(user, filters.unit_id, filters.format);
      const logs = await this.list
        .buildQuery(filters)
        .take(MAX_REPORT_ROWS + 1)
        .getMany();
      if (logs.length > MAX_REPORT_ROWS)
        throw new PayloadTooLargeException(
          'Existem mais de 10 mil eventos. Reduza o período ou use mais filtros.',
        );
      const report = buildAuditReport(logs, unit, filters);
      const file = await this.files.create(report, filters.format, `auditoria-unidade-${unit.id}`);
      await this.audit.safeRecord({
        action: 'EXPORT_AUDIT',
        entity: 'audit_logs',
        userId: user.id,
        unitId: unit.id,
        description: `Exportação ${filters.format}`,
      });
      return file;
    } catch (error) {
      this.logger.error('Audit export failed', error instanceof Error ? error.stack : undefined);
      await this.audit.safeRecord({
        action: 'EXPORT_AUDIT',
        entity: 'audit_logs',
        userId: user.id,
        unitId: filters.unit_id,
        outcome: AuditOutcome.FAILURE,
      });
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'Não foi possível exportar a auditoria. Tente novamente em instantes.',
      );
    }
  }
}
