import { apiUpload, API_URL } from './api';
import { ApiError } from './api-error-translations';
import { resetCsrfToken } from './csrf';

jest.mock('@/shared/lib/toast', () => ({ toast: { error: jest.fn() } }));

function response(status: number, payload: unknown): Response {
  const result = { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(payload), json: async () => payload };
  return { ...result, clone: () => result } as unknown as Response;
}

describe('image uploads', () => {
  const originalFetch = global.fetch;
  beforeEach(() => resetCsrfToken());
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

  test.each(['/users/11/logo', '/units/4/logo', '/products/7/images'])(
    '%s refreshes an expired session and retries the same multipart body', async (path) => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce(response(200, { csrf_token: 'csrf-1' }))
        .mockResolvedValueOnce(response(401, { message: 'Unauthorized' }))
        .mockResolvedValueOnce(response(200, {}))
        .mockResolvedValueOnce(response(201, { ok: true }));
      global.fetch = fetchMock;
      const body = new FormData();
      body.append(path.includes('/products/') ? 'files' : 'file', new File(['image'], 'photo.png', { type: 'image/png' }));
      await expect(apiUpload(path, body, { silent: true })).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/auth/csrf`);
      expect(fetchMock.mock.calls[2][0]).toBe(`${API_URL}/auth/refresh`);
      expect(new Headers(fetchMock.mock.calls[2][1].headers).get('x-csrf-token')).toBe('csrf-1');
      for (const index of [1, 3]) {
        const [url, init] = fetchMock.mock.calls[index];
        const headers = new Headers(init.headers);
        expect(url).toBe(`${API_URL}${path}`);
        expect(init.body).toBe(body);
        expect(init.credentials).toBe('include');
        expect(headers.get('x-csrf-token')).toBe('csrf-1');
        expect(headers.get('content-type')).toBeNull();
      }
    },
  );

  test('failed refresh expires the session without retrying the file', async () => {
    const dispatch = jest.spyOn(window, 'dispatchEvent');
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(response(200, { csrf_token: 'csrf-1' }))
      .mockResolvedValueOnce(response(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(response(401, {}));
    global.fetch = fetchMock;
    await expect(apiUpload('/units/4/logo', new FormData(), { silent: true })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:session-expired' }));
  });
});
