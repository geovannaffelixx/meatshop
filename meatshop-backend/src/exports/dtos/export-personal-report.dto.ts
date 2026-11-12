import { PickType } from '@nestjs/swagger';
import { ExportReportDto } from './export-report.dto';

export class ExportPersonalReportDto extends PickType(ExportReportDto, [
  'unit_id',
  'format',
] as const) {}
