import { jest } from '@jest/globals';
import type { EntityManager } from 'typeorm';
import { queryReportSection } from './queries/query-report-section';
import { assertReportFileSize, assertReportSize, MAX_REPORT_FILE_BYTES } from './report-size';
import type { ReportDocument } from './report.types';

function report(value: string): ReportDocument {
  return {
    title: 'Teste',
    generatedAt: new Date('2026-11-01T12:00:00Z'),
    filters: [],
    sections: [
      {
        title: 'Dados',
        columns: [{ key: 'value', label: 'Valor' }],
        rows: [{ value }],
      },
    ],
  };
}

describe('Report size safeguards', () => {
  it('rejects a single field that is unsafe for Excel and PDF renderers', () => {
    expect(() => assertReportSize(report('x'.repeat(30_001)))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'EXPORT_TOO_LARGE' }) }),
    );
  });

  it('measures the generated file in bytes', () => {
    expect(() => assertReportFileSize(Buffer.alloc(MAX_REPORT_FILE_BYTES + 1))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'EXPORT_TOO_LARGE' }) }),
    );
  });

  it('rejects an oversized database result before loading its rows', async () => {
    const query = jest
      .fn<() => Promise<unknown[]>>()
      .mockResolvedValueOnce([{ row_count: 2, byte_count: 8 * 1024 * 1024 + 1 }]);
    await expect(
      queryReportSection({ query } as unknown as EntityManager, 'Dados', [], 'SELECT 1', []),
    ).rejects.toMatchObject({ response: { code: 'EXPORT_TOO_LARGE' } });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
