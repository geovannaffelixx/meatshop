import { apiGet, apiPatch, apiPost, API_URL } from './api';
import { ApiError } from './api-error-translations';
import { resetCsrfToken } from './csrf';

jest.mock('@/shared/lib/toast', () => ({ toast: { error: jest.fn() } }));

function response(status: number, payload: unknown): Response {
  const result = { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(payload), json: async () => payload };
  return { ...result, clone: () => result } as unknown as Response;
}

const csrfRejection = () => response(403, { statusCode: 403, code: 'CSRF_TOKEN_INVALID', message: 'Invalid CSRF token' });
const csrfHeader = (call: unknown[]) => new Headers((call[1] as RequestInit).headers).get('x-csrf-token');

describe('CSRF protection', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  beforeEach(() => { resetCsrfToken(); fetchMock = jest.fn(); global.fetch = fetchMock; });
  afterEach(() => { global.fetch = originalFetch; });

  it('does not request a token for safe requests', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { ok: true }));
    await apiGet('/orders', { cache: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(csrfHeader(fetchMock.mock.calls[0])).toBeNull();
  });

  it.each(['/auth/login', '/auth/register-unit', '/auth/register-unit/?source=web'])(
    'does not require a CSRF token for public authentication at %s', async (path) => {
      fetchMock.mockResolvedValueOnce(response(200, {}));
      await apiPost(path, {});
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(csrfHeader(fetchMock.mock.calls[0])).toBeNull();
    },
  );

  it('does not exempt routes merely sharing a public route prefix', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { csrf_token: 'token' }))
      .mockResolvedValueOnce(response(200, {}));
    await apiPost('/auth/register-unit/private', {});
    expect(csrfHeader(fetchMock.mock.calls[1])).toBe('token');
  });

  it('fetches the token lazily once and sends it on every mutating request', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { csrf_token: 'token-a' }))
      .mockResolvedValueOnce(response(200, {}))
      .mockResolvedValueOnce(response(200, {}));
    await apiPost('/products', { name: 'Picanha' });
    await apiPatch('/products/1/status', { is_active: false });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([`${API_URL}/auth/csrf`, `${API_URL}/products`, `${API_URL}/products/1/status`]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
    expect(csrfHeader(fetchMock.mock.calls[1])).toBe('token-a');
    expect(csrfHeader(fetchMock.mock.calls[2])).toBe('token-a');
  });

  it('refetches the token and retries once when the API rejects it', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { csrf_token: 'stale' }))
      .mockResolvedValueOnce(csrfRejection())
      .mockResolvedValueOnce(response(200, { csrf_token: 'fresh' }))
      .mockResolvedValueOnce(response(201, { id: 3 }));
    await expect(apiPost('/promotions', {}, { silent: true })).resolves.toEqual({ id: 3 });
    expect(csrfHeader(fetchMock.mock.calls[3])).toBe('fresh');
  });

  it('does not retry indefinitely when the token keeps being rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { csrf_token: 'a' }))
      .mockResolvedValueOnce(csrfRejection())
      .mockResolvedValueOnce(response(200, { csrf_token: 'b' }))
      .mockResolvedValueOnce(csrfRejection());
    await expect(apiPost('/promotions', {}, { silent: true })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('skips exempt login and resets the token for the new session', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { csrf_token: 'before' }))
      .mockResolvedValueOnce(response(200, {}))
      .mockResolvedValueOnce(response(200, {}))
      .mockResolvedValueOnce(response(200, { csrf_token: 'after' }))
      .mockResolvedValueOnce(response(200, {}));
    await apiPost('/orders/1/notes', {});
    await apiPost('/auth/login', { email: 'a@b.c', password: 'x' });
    await apiPost('/orders/1/notes', {});
    expect(fetchMock.mock.calls[2][0]).toBe(`${API_URL}/auth/login`);
    expect(csrfHeader(fetchMock.mock.calls[2])).toBeNull();
    expect(fetchMock.mock.calls[3][0]).toBe(`${API_URL}/auth/csrf`);
    expect(csrfHeader(fetchMock.mock.calls[4])).toBe('after');
  });
});
