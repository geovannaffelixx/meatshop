import { personalReport } from '../utils/personal-report';
import { HttpException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { AuditTrailService } from '../../audit/audit-trail.service';
import { AuditOutcome } from '../../audit/entities/audit-log.entity';
import { ExportPersonalReportDto } from '../../exports/dtos/export-personal-report.dto';
import { ReportAccessService } from '../../exports/report-access.service';
import { ReportFileService } from '../../exports/report-file.service';
import { User } from '../entities/user.entity';
import { ExportPersonalDataUseCase } from './export-personal-data.use-case';

@Injectable()
export class ExportPersonalReportUseCase {
  private readonly logger = new Logger(ExportPersonalReportUseCase.name);
  constructor(
    private readonly data: ExportPersonalDataUseCase,
    private readonly access: ReportAccessService,
    private readonly files: ReportFileService,
    private readonly audit: AuditTrailService,
  ) {}

  async execute(filters: ExportPersonalReportDto, user: User) {
    try {
      const unit = await this.access.assert(user, filters.unit_id, filters.format);
      const personal = await this.data.execute(user.id);
      const report = personalReport(personal.data, unit);
      const file = await this.files.create(report, filters.format, 'meus-dados', personal);
      await this.record(user, unit.id, AuditOutcome.SUCCESS);
      return file;
    } catch (error) {
      this.logger.error(
        'Personal report export failed',
        error instanceof Error ? error.stack : undefined,
      );
      await this.record(user, filters.unit_id, AuditOutcome.FAILURE);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'Não foi possível preparar seus dados. Tente novamente em instantes.',
      );
    }
  }

  private record(user: User, unitId: number, outcome: AuditOutcome) {
    return this.audit.safeRecord({
      action: 'EXPORT_PERSONAL_DATA',
      entity: 'users',
      userId: user.id,
      unitId,
      outcome,
      description: 'Exportação dos próprios dados pessoais',
    });
  }
}
