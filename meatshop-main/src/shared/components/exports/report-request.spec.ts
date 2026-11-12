import { requestReport } from './report-request';
import { apiGet } from '@/shared/lib/api';

jest.mock('@/shared/lib/api', () => ({ apiGet: jest.fn() }));

describe('Report filter requests', () => {
  it('converts audit days to the unit timezone and includes the last millisecond', () => {
    requestReport(
      'audit',
      { date_from: '2026-11-01', date_to: '2026-11-01', page: '10' },
      2,
      'pdf',
      new AbortController().signal,
    );
    const url = new URL(jest.mocked(apiGet).mock.calls[0][0], 'http://test');
    expect(url.searchParams.get('date_from')).toBe('2026-11-01T03:00:00.000Z');
    expect(url.searchParams.get('date_to')).toBe('2026-11-02T02:59:59.999Z');
    expect(url.searchParams.has('page')).toBe(false);
  });
});
