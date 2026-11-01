import { Injectable } from '@nestjs/common';
import { displayCell } from '../report.types';
import { Workbook, Worksheet } from 'exceljs';
import { UnitReport, ReportSection, ReportCell } from '../report.types';

@Injectable()
export class ExcelReportRenderer {
  async render(report: UnitReport): Promise<Buffer> {
    const workbook = new Workbook();
    workbook.creator = 'MeatShop';
    workbook.created = report.generatedAt;
    for (const section of report.sections) this.addSheet(workbook, report, section);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private addSheet(workbook: Workbook, report: UnitReport, section: ReportSection): void {
    const sheet = workbook.addWorksheet(section.title.slice(0, 31));
    sheet.columns = section.columns.map((column) => ({
      key: column.key,
      width: column.width ?? 24,
    }));
    this.addHeading(sheet, report, section);
    for (let row = 1; row <= sheet.rowCount; row++)
      sheet.mergeCells(row, 1, row, section.columns.length);
    const headerIndex = sheet.rowCount + 2;
    const header = sheet.getRow(headerIndex);
    header.values = section.columns.map((column) => column.label);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
    header.height = 28;
    for (const record of section.rows) this.addRow(sheet, section, record);
    sheet.views = [{ state: 'frozen', ySplit: headerIndex }];
    sheet.autoFilter = {
      from: { row: headerIndex, column: 1 },
      to: { row: sheet.rowCount, column: section.columns.length },
    };
    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    sheet.pageSetup.printTitlesRow = `${headerIndex}:${headerIndex}`;
    sheet.headerFooter.oddFooter = '&LMeatShop&C&P / &N';
  }

  private addHeading(sheet: Worksheet, report: UnitReport, section: ReportSection): void {
    sheet.addRow([`MeatShop · ${report.title}`]);
    sheet.getRow(1).font = { size: 18, bold: true, color: { argb: 'FFB91C1C' } };
    sheet.getRow(1).height = 34;
    sheet.addRow([`Unidade: ${report.unit.name} (#${report.unit.id})`]);
    sheet.addRow([
      `Gerado em: ${report.generatedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    ]);
    for (const filter of report.filters) sheet.addRow([filter]);
    sheet.addRow([section.title]);
    sheet.getRow(sheet.rowCount).font = { bold: true, size: 12 };
  }

  private addRow(
    sheet: Worksheet,
    section: ReportSection,
    record: Record<string, ReportCell>,
  ): void {
    const row = sheet.addRow(
      section.columns.map((column) =>
        column.kind === 'label' ? displayCell(record[column.key], 'label') : record[column.key],
      ),
    );
    row.alignment = { vertical: 'top', wrapText: true };
    section.columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      if (column.kind === 'money') cell.numFmt = '"R$" #,##0.00';
      if (column.kind === 'number') cell.numFmt = '#,##0.###';
      if (column.kind === 'date') {
        const value = record[column.key];
        cell.value = value
          ? new Date(
              new Date(value)
                .toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })
                .replace(' ', 'T') + 'Z',
            )
          : null;
        cell.numFmt = 'dd/mm/yyyy hh:mm';
      }
      if (row.number % 2 === 0)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    });
  }
}
