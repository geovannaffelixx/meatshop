import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { displayCell, reportIdentity, ReportSection, ReportDocument } from '../report.types';

const BRAND = '#b91c1c';
const DARK = '#0f172a';
const MUTED = '#475569';
const LIGHT = '#f8fafc';
const BORDER = '#cbd5e1';
type PdfDoc = InstanceType<typeof PDFDocument>;

@Injectable()
export class PdfReportRenderer {
  async render(report: ReportDocument): Promise<Buffer> {
    const widest = Math.max(...report.sections.map((section) => section.columns.length), 1);
    const doc = new PDFDocument({
      size: widest > 8 ? 'A3' : 'A4',
      layout: 'landscape',
      margin: 36,
      bufferPages: true,
      info: { Title: report.title, Author: 'MeatShop', Creator: 'MeatShop' },
    });
    const chunks: Buffer[] = [];
    const output = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
    try {
      report.sections.forEach((section, index) => {
        if (index) doc.addPage();
        this.heading(doc, report, section.title);
        this.table(doc, report, section);
      });
      this.footers(doc);
      doc.end();
    } catch (error) {
      doc.destroy(error as Error);
    }
    return output;
  }

  private heading(doc: PdfDoc, report: ReportDocument, section: string): void {
    const left = doc.page.margins.left;
    const available = doc.page.width - left - doc.page.margins.right;
    doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(20).text('MEATSHOP', left, 30);
    doc.fillColor(DARK).fontSize(14).text(report.title, left, 55);
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED);
    doc.text(reportIdentity(report), left, 76);
    doc.text(`Gerado em ${displayCell(report.generatedAt, 'date')}`, left, 88);

    const filters = report.filters.length
      ? report.filters.map((item) => `• ${item}`).join('\n')
      : '• Sem filtros adicionais';
    const filterHeight = Math.max(28, doc.heightOfString(filters, { width: available - 16 }) + 12);
    doc.roundedRect(left, 104, available, filterHeight, 3).fill(LIGHT);
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .text(filters, left + 8, 110, { width: available - 16 });
    doc.y = 104 + filterHeight + 12;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text(section, left, doc.y);
    doc.moveDown(0.5);
  }

  private table(doc: PdfDoc, report: ReportDocument, section: ReportSection): void {
    const widths = this.columnWidths(doc, section);
    const fontSize = section.columns.length > 8 ? 6.5 : section.columns.length > 6 ? 7 : 8;
    this.row(
      doc,
      section.columns.map((column) => column.label),
      widths,
      true,
      fontSize,
      0,
    );
    section.rows.forEach((record, rowIndex) => {
      const cells = section.columns.map((column) => displayCell(record[column.key], column.kind));
      for (const part of this.splitCells(cells, widths, fontSize)) {
        if (doc.y + this.rowHeight(doc, part, widths, fontSize) > doc.page.height - 54) {
          doc.addPage();
          this.heading(doc, report, section.title);
          this.row(
            doc,
            section.columns.map((column) => column.label),
            widths,
            true,
            fontSize,
            0,
          );
        }
        this.row(doc, part, widths, false, fontSize, rowIndex);
      }
    });
    if (!section.rows.length)
      doc
        .roundedRect(doc.page.margins.left, doc.y, doc.page.width - 72, 34, 3)
        .fill(LIGHT)
        .fillColor(MUTED)
        .font('Helvetica-Oblique')
        .fontSize(9)
        .text('Nenhum registro para os filtros selecionados.', 44, doc.y + 12, {
          align: 'center',
          width: doc.page.width - 88,
        });
  }

  private splitCells(cells: string[], widths: number[], fontSize: number): string[][] {
    const parts = cells.map((cell, index) => {
      const size = Math.max(80, Math.floor((widths[index] - 10) / (fontSize * 0.55)) * 12);
      const text = Array.from(cell);
      return Array.from({ length: Math.max(1, Math.ceil(text.length / size)) }, (_, index) =>
        text.slice(index * size, (index + 1) * size).join(''),
      );
    });
    return Array.from({ length: Math.max(...parts.map((part) => part.length)) }, (_, index) =>
      parts.map((part) => part[index] ?? ''),
    );
  }

  private rowHeight(doc: PdfDoc, cells: string[], widths: number[], fontSize: number): number {
    doc.fontSize(fontSize);
    return Math.max(
      24,
      ...cells.map((cell, index) => doc.heightOfString(cell, { width: widths[index] - 10 }) + 12),
    );
  }

  private row(
    doc: PdfDoc,
    cells: string[],
    widths: number[],
    header: boolean,
    fontSize: number,
    rowIndex: number,
  ): void {
    const y = doc.y;
    const left = doc.page.margins.left;
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    const height = this.rowHeight(doc, cells, widths, fontSize);
    const total = widths.reduce((sum, width) => sum + width, 0);
    doc.rect(left, y, total, height).fill(header ? BRAND : rowIndex % 2 ? LIGHT : '#ffffff');
    let x = left;
    cells.forEach((cell, index) => {
      doc.rect(x, y, widths[index], height).lineWidth(0.4).strokeColor(BORDER).stroke();
      doc.fillColor(header ? '#ffffff' : DARK).text(cell, x + 5, y + 6, {
        width: widths[index] - 10,
        height: height - 9,
        align: header ? 'center' : 'left',
      });
      x += widths[index];
    });
    doc.x = left;
    doc.y = y + height;
  }

  private columnWidths(doc: PdfDoc, section: ReportSection): number[] {
    const available = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const weights = section.columns.map((column) => {
      if (column.width) return Math.max(8, column.width);
      if (column.kind === 'date') return 20;
      if (column.kind === 'money' || column.kind === 'number') return 14;
      return Math.min(32, Math.max(12, column.label.length + 4));
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return weights.map((weight) => (available * weight) / total);
  }

  private footers(doc: PdfDoc): void {
    const { count } = doc.bufferedPageRange();
    for (let index = 0; index < count; index++) {
      doc.switchToPage(index);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(`MeatShop · Relatório confidencial`, 36, doc.page.height - 30, { lineBreak: false })
        .text(`${index + 1} / ${count}`, doc.page.width - 100, doc.page.height - 30, {
          align: 'right',
          width: 64,
          lineBreak: false,
        });
    }
  }
}
