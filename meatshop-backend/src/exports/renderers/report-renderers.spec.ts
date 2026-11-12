import { Workbook } from 'exceljs';
import type { UnitReport } from '../report.types';
import { ExcelReportRenderer } from './excel-report.renderer';
import { PdfReportRenderer } from './pdf-report.renderer';

describe('Export files', () => {
  const report: UnitReport = {
    title: 'Pedidos',
    unit: { id: 1, name: 'Açougue São João' },
    generatedAt: new Date('2026-11-01T12:00:00Z'),
    filters: ['Mês: 2026-11'],
    sections: [
      {
        title: 'Pedidos',
        columns: [
          { key: 'name', label: 'Produto' },
          { key: 'amount', label: 'Valor', kind: 'money' },
          { key: 'date', label: 'Data', kind: 'date' },
        ],
        rows: [{ name: '=SUM(A1:A2)', amount: 123.45, date: new Date('2026-11-01T12:00:00Z') }],
      },
    ],
  };
  it('writes a readable workbook with numeric money, local dates, filters and frozen headings', async () => {
    const buffer = await new ExcelReportRenderer().render(report);
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];
    const row = sheet.lastRow!;
    expect(row.getCell(1).value).toBe('=SUM(A1:A2)');
    expect(row.getCell(1).type).toBe(3);
    expect(row.getCell(2).value).toBe(123.45);
    expect(row.getCell(2).numFmt).toContain('R$');
    expect((row.getCell(3).value as Date).toISOString()).toBe('2026-11-01T09:00:00.000Z');
    expect(sheet.autoFilter).toBeDefined();
    expect(sheet.views[0].state).toBe('frozen');
    expect(sheet.views[0].showGridLines).toBe(false);
    expect(row.getCell(1).border.bottom?.style).toBe('thin');
  });
  it('renders an empty report as a valid PDF', async () => {
    const buffer = await new PdfReportRenderer().render({
      ...report,
      sections: [{ ...report.sections[0], rows: [] }],
    });
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.subarray(-20).toString()).toContain('%%EOF');
  });
  it('paginates long tables and very long cell contents', async () => {
    const buffer = await new PdfReportRenderer().render({
      ...report,
      sections: [
        {
          ...report.sections[0],
          rows: Array.from({ length: 120 }, (_, index) => ({
            name: index === 0 ? 'Descrição extensa '.repeat(700) : `Produto ${index}`,
            amount: index,
            date: report.generatedAt,
          })),
        },
      ],
    });
    expect((buffer.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(4);
    expect(buffer.subarray(-20).toString()).toContain('%%EOF');
  });
  it('uses a wider page for reports with nine or more columns', async () => {
    const columns = Array.from({ length: 9 }, (_, index) => ({
      key: `field_${index}`,
      label: `Campo ${index + 1}`,
    }));
    const buffer = await new PdfReportRenderer().render({
      ...report,
      sections: [
        {
          title: 'Relatório amplo',
          columns,
          rows: [Object.fromEntries(columns.map((column) => [column.key, 'Conteúdo']))],
        },
      ],
    });
    const mediaBox = buffer.toString('latin1').match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
    expect(Number(mediaBox?.[1])).toBeGreaterThan(1000);
    expect(buffer.subarray(-20).toString()).toContain('%%EOF');
  });
});
