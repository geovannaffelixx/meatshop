import { apiUpload, API_URL } from './api';
import { ApiError } from './api-error-translations';

jest.mock('@/shared/lib/toast', () => ({ toast: { error: jest.fn() } }));

function response(status: number, payload: unknown): Response {
  return { status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(payload) } as Response;
}

describe('image uploads', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

  test.each(['/users/11/logo', '/units/4/logo', '/products/7/images'])(
    '%s refreshes an expired session and retries the same multipart body', async (path) => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce(response(401, { message: 'Unauthorized' }))
        .mockResolvedValueOnce(response(200, {}))
        .mockResolvedValueOnce(response(201, { ok: true }));
      global.fetch = fetchMock;
      const body = new FormData();
      body.append(path.includes('/products/') ? 'files' : 'file', new File(['image'], 'photo.png', { type: 'image/png' }));
      await expect(apiUpload(path, body, { silent: true })).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/auth/refresh`);
      for (const index of [0, 2]) {
        const [url, init] = fetchMock.mock.calls[index];
        expect(url).toBe(`${API_URL}${path}`);
        expect(init.body).toBe(body);
        expect(init.credentials).toBe('include');
        expect(init.headers).toBeUndefined();
      }
    },
  );

  test('failed refresh expires the session without retrying the file', async () => {
    const dispatch = jest.spyOn(window, 'dispatchEvent');
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(response(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(response(401, {}));
    global.fetch = fetchMock;
    await expect(apiUpload('/units/4/logo', new FormData(), { silent: true })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:session-expired' }));
  });
});
