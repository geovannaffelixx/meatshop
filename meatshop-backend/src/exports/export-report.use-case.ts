import { HttpException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { AuditTrailService } from '../audit/audit-trail.service';
import { AuditOutcome } from '../audit/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { BuildUnitReportUseCase } from './build-unit-report.use-case';
import { ExportReportDto } from './dtos/export-report.dto';
import { ReportAccessService } from './report-access.service';
import { ReportFileService } from './report-file.service';

@Injectable()
export class ExportReportUseCase {
  private readonly logger = new Logger(ExportReportUseCase.name);
  constructor(
    private readonly access: ReportAccessService,
    private readonly builder: BuildUnitReportUseCase,
    private readonly files: ReportFileService,
    private readonly audit: AuditTrailService,
  ) {}

  async execute(filters: ExportReportDto, user: User) {
    try {
      const unit = await this.access.assert(user, filters.unit_id, filters.format);
      const report = await this.builder.execute(filters, user, unit);
      const file = await this.files.create(
        report,
        filters.format,
        `${filters.report}-unidade-${unit.id}`,
      );
      await this.record(filters, user, AuditOutcome.SUCCESS);
      return file;
    } catch (error) {
      this.logger.error(
        `Report export failed: ${filters.report}, unit ${filters.unit_id}, user ${user.id}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.record(filters, user, AuditOutcome.FAILURE);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'Não foi possível preparar o arquivo. Tente novamente em instantes.',
      );
    }
  }

  private record(filters: ExportReportDto, user: User, outcome: AuditOutcome) {
    return this.audit.safeRecord({
      action: 'EXPORT_REPORT',
      entity: 'reports',
      userId: user.id,
      unitId: filters.unit_id,
      outcome,
      description: `Exportação ${filters.report} (${filters.format})`,
    });
  }
}
