import { Injectable } from '@nestjs/common';
import { Border, Fill, Workbook, Worksheet } from 'exceljs';
import { displayCell, reportIdentity } from '../report.types';
import type { ReportCell, ReportColumn, ReportDocument, ReportSection } from '../report.types';

const BRAND = 'FFB91C1C';
const DARK = 'FF0F172A';
const MUTED = 'FF475569';
const LIGHT = 'FFF8FAFC';
const BORDER = 'FFE2E8F0';
const headerFill: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
const thinBorder: Partial<Border> = { style: 'thin', color: { argb: BORDER } };

@Injectable()
export class ExcelReportRenderer {
  async render(report: ReportDocument): Promise<Buffer> {
    const workbook = new Workbook();
    workbook.creator = 'MeatShop';
    workbook.company = 'MeatShop';
    workbook.created = report.generatedAt;
    workbook.modified = report.generatedAt;
    report.sections.forEach((section, index) => this.addSheet(workbook, report, section, index));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private addSheet(
    workbook: Workbook,
    report: ReportDocument,
    section: ReportSection,
    index: number,
  ): void {
    const sheet = workbook.addWorksheet(this.sheetName(workbook, section.title, index));
    sheet.properties.defaultRowHeight = 20;
    sheet.columns = section.columns.map((column) => ({
      key: column.key,
      width: this.columnWidth(column),
    }));
    this.addHeading(sheet, report, section);
    for (let row = 1; row <= sheet.rowCount; row++)
      sheet.mergeCells(row, 1, row, section.columns.length);
    const headerIndex = sheet.rowCount + 2;
    const header = sheet.getRow(headerIndex);
    header.values = section.columns.map((column) => column.label);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = headerFill;
    header.height = 28;
    header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    header.eachCell((cell) => {
      cell.border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
    });
    if (section.rows.length) {
      for (const record of section.rows) this.addRow(sheet, section, record);
    } else {
      const empty = sheet.addRow(['Nenhum registro para os filtros selecionados.']);
      sheet.mergeCells(empty.number, 1, empty.number, section.columns.length);
      empty.height = 30;
      empty.font = { italic: true, color: { argb: MUTED } };
      empty.alignment = { vertical: 'middle', horizontal: 'center' };
      empty.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
    }
    sheet.views = [
      {
        state: 'frozen',
        ySplit: headerIndex,
        activeCell: `A${headerIndex + 1}`,
        showGridLines: false,
      },
    ];
    sheet.autoFilter = {
      from: { row: headerIndex, column: 1 },
      to: { row: Math.max(headerIndex, sheet.rowCount), column: section.columns.length },
    };
    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    };
    sheet.pageSetup.printTitlesRow = `${headerIndex}:${headerIndex}`;
    sheet.headerFooter.oddHeader = '&L&BMeatShop&RRelatório confidencial';
    sheet.headerFooter.oddFooter = '&LGerado pelo MeatShop&C&P / &N&R&D &T';
  }

  private addHeading(sheet: Worksheet, report: ReportDocument, section: ReportSection): void {
    const brand = sheet.addRow(['MEATSHOP']);
    brand.height = 30;
    brand.font = { size: 20, bold: true, color: { argb: BRAND } };
    brand.alignment = { vertical: 'middle' };
    const title = sheet.addRow([report.title]);
    title.height = 25;
    title.font = { size: 15, bold: true, color: { argb: DARK } };
    const identity = sheet.addRow([reportIdentity(report)]);
    identity.font = { size: 10, color: { argb: MUTED } };
    const generated = sheet.addRow([
      `Gerado em: ${report.generatedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    ]);
    generated.font = { size: 10, color: { argb: MUTED } };
    for (const filter of report.filters) {
      const row = sheet.addRow([`Filtro: ${filter}`]);
      row.font = { size: 9, color: { argb: MUTED } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
    }
    const sectionRow = sheet.addRow([section.title]);
    sectionRow.height = 25;
    sectionRow.font = { bold: true, size: 12, color: { argb: DARK } };
    sectionRow.alignment = { vertical: 'middle' };
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
      cell.border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
      if (column.kind === 'money') {
        cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
        cell.alignment = { vertical: 'top', horizontal: 'right', wrapText: true };
      }
      if (column.kind === 'number') {
        cell.numFmt = '#,##0.###';
        cell.alignment = { vertical: 'top', horizontal: 'right', wrapText: true };
      }
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
        cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
      }
      if (row.number % 2 === 0)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
    });
  }

  private columnWidth(column: ReportColumn): number {
    if (column.width) return Math.min(80, Math.max(10, column.width));
    if (column.kind === 'date') return 21;
    if (column.kind === 'money' || column.kind === 'number') return 16;
    return Math.min(32, Math.max(14, column.label.length + 4));
  }

  private sheetName(workbook: Workbook, title: string, index: number): string {
    const base =
      title
        .replace(/[\\/?*:[\]]/g, ' ')
        .trim()
        .slice(0, 27) || `Relatório ${index + 1}`;
    let name = base;
    let suffix = 2;
    while (workbook.getWorksheet(name)) name = `${base.slice(0, 27)} (${suffix++})`.slice(0, 31);
    return name;
  }
}
