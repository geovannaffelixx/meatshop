import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { displayCell, ReportSection, UnitReport } from '../report.types';

@Injectable()
export class PdfReportRenderer {
  async render(report: UnitReport): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
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

  private heading(
    doc: InstanceType<typeof PDFDocument>,
    report: UnitReport,
    section: string,
  ): void {
    doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(20).text('MeatShop');
    doc.fillColor('#0f172a').fontSize(14).text(report.title);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(
      `${report.unit.name} (#${report.unit.id}) · ${displayCell(report.generatedAt, 'date')}`,
    );
    report.filters.forEach((filter) => doc.text(filter));
    doc
      .moveDown()
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#0f172a')
      .text(section)
      .moveDown(0.5);
  }

  private table(
    doc: InstanceType<typeof PDFDocument>,
    report: UnitReport,
    section: ReportSection,
  ): void {
    const width = (doc.page.width - 72) / section.columns.length;
    this.row(
      doc,
      section.columns.map((column) => column.label),
      width,
      true,
    );
    for (const record of section.rows) {
      const cells = section.columns.map((column) => displayCell(record[column.key], column.kind));
      for (const part of this.splitCells(cells, width)) {
        if (doc.y + this.rowHeight(doc, part, width) > doc.page.height - 56) {
          doc.addPage();
          this.heading(doc, report, section.title);
          this.row(
            doc,
            section.columns.map((column) => column.label),
            width,
            true,
          );
        }
        this.row(doc, part, width, false);
      }
    }
    if (!section.rows.length)
      doc.fillColor('#64748b').text('Nenhum registro para os filtros selecionados.');
  }

  private splitCells(cells: string[], width: number): string[][] {
    const size = Math.max(80, Math.floor((width - 12) / 5) * 14);
    const parts = cells.map((cell) => {
      const text = Array.from(cell);
      return Array.from({ length: Math.max(1, Math.ceil(text.length / size)) }, (_, index) =>
        text.slice(index * size, (index + 1) * size).join(''),
      );
    });
    return Array.from({ length: Math.max(...parts.map((part) => part.length)) }, (_, index) =>
      parts.map((part) => part[index] ?? ''),
    );
  }

  private rowHeight(doc: InstanceType<typeof PDFDocument>, cells: string[], width: number): number {
    doc.fontSize(8);
    return Math.max(
      26,
      ...cells.map((cell) => doc.heightOfString(cell, { width: width - 12 }) + 14),
    );
  }

  private row(
    doc: InstanceType<typeof PDFDocument>,
    cells: string[],
    width: number,
    header: boolean,
  ): void {
    const y = doc.y;
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
    const height = this.rowHeight(doc, cells, width);
    doc.rect(36, y, width * cells.length, height).fill(header ? '#b91c1c' : '#f8fafc');
    cells.forEach((cell, index) => {
      doc.fillColor(header ? '#ffffff' : '#0f172a').text(cell, 42 + index * width, y + 7, {
        width: width - 12,
        height: height - 10,
      });
    });
    doc.x = 36;
    doc.y = y + height + 2;
  }

  private footers(doc: InstanceType<typeof PDFDocument>): void {
    const { count } = doc.bufferedPageRange();
    for (let index = 0; index < count; index++) {
      doc.switchToPage(index);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text(`MeatShop · ${index + 1} / ${count}`, 36, doc.page.height - 32, { lineBreak: false });
    }
  }
}
