import { apiGet } from './api';
import { ApiError } from './api-error-translations';
import { resetCsrfToken } from './csrf';

jest.mock('@/shared/lib/toast', () => ({ toast: { error: jest.fn() } }));

function response(status: number, payload: unknown): Response {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(payload), json: async () => payload, clone() { return this; } } as Response;
}

describe('Authenticated report downloads', () => {
  const originalFetch = global.fetch;
  beforeEach(() => resetCsrfToken());
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

  it('refreshes an expired session and keeps the binary response intact', async () => {
    const file = new Blob(['%PDF-report'], { type: 'application/pdf' });
    const fetchMock = jest.fn().mockResolvedValueOnce(response(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(response(200, { csrf_token: 'csrf-test' })).mockResolvedValueOnce(response(200, {}))
      .mockResolvedValueOnce({ ...response(200, {}), blob: async () => file });
    global.fetch = fetchMock;
    await expect(apiGet('/exports/reports?unit_id=1&report=orders&format=pdf', { cache: false, silent: true, responseType: 'blob' })).resolves.toBe(file);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });
  it('reads an error response as JSON instead of downloading it as a file', async () => {
    const file = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ...response(413, { message: 'Este relatório tem mais de 10 mil registros. Reduza o período.' }), blob: file });
    await expect(apiGet('/exports/reports', { cache: false, silent: true, responseType: 'blob' })).rejects.toBeInstanceOf(ApiError);
    expect(file).not.toHaveBeenCalled();
  });
});
