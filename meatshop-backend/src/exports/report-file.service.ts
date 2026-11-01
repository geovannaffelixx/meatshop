import { Injectable } from '@nestjs/common';
import { ExcelReportRenderer } from './renderers/excel-report.renderer';
import { PdfReportRenderer } from './renderers/pdf-report.renderer';
import { UnitReport } from './report.types';

export const REPORT_MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  json: 'application/json',
};
export type ReportFormat = keyof typeof REPORT_MIME;

@Injectable()
export class ReportFileService {
  constructor(
    private readonly excel: ExcelReportRenderer,
    private readonly pdf: PdfReportRenderer,
  ) {}

  async create(report: UnitReport, format: ReportFormat, name: string, json: unknown = report) {
    const buffer =
      format === 'xlsx'
        ? await this.excel.render(report)
        : format === 'pdf'
          ? await this.pdf.render(report)
          : Buffer.from(JSON.stringify(json, null, 2));
    return {
      buffer,
      mime: REPORT_MIME[format],
      filename: `meatshop-${name}-${report.generatedAt.toISOString().slice(0, 10)}.${format}`,
    };
  }
}
