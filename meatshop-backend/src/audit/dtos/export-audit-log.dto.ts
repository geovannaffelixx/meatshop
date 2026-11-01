import { IntersectionType, OmitType } from '@nestjs/swagger';
import { ExportPersonalReportDto } from '../../exports/dtos/export-personal-report.dto';
import { FilterAuditLogDto } from './filter-audit-log.dto';

export class ExportAuditLogDto extends IntersectionType(
  OmitType(FilterAuditLogDto, ['unit_id', 'page', 'limit'] as const),
  ExportPersonalReportDto,
) {}
