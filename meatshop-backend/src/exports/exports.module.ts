import { FinanceReportService } from './finance-report.service';
import { Module } from '@nestjs/common';
import { ReportFileService } from './report-file.service';
import { UnitsModule } from '../units/units.module';
import { FinanceModule } from '../finance/finance.module';
import { BuildUnitReportUseCase } from './build-unit-report.use-case';
import { ExportReportUseCase } from './export-report.use-case';
import { ExportsController } from './exports.controller';
import { ReportAccessService } from './report-access.service';
import { ExcelReportRenderer } from './renderers/excel-report.renderer';
import { PdfReportRenderer } from './renderers/pdf-report.renderer';

@Module({
  imports: [UnitsModule, FinanceModule],
  controllers: [ExportsController],
  providers: [
    FinanceReportService,
    ReportFileService,
    BuildUnitReportUseCase,
    ExportReportUseCase,
    ReportAccessService,
    ExcelReportRenderer,
    PdfReportRenderer,
  ],
  exports: [ReportAccessService, ReportFileService],
})
export class ExportsModule {}
