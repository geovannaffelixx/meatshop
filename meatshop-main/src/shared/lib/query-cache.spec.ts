import { resetCsrfToken } from './csrf';
import { apiGet, apiPatch } from './api';
import { apiQueryKey, panelQueryClient, peekApiData, resetApiCache } from './query-cache';

jest.mock('@/shared/lib/toast', () => ({ toast: { error: jest.fn() } }));

describe('Session and unit API cache', () => {
  const fetchMock = jest.fn();
  const response = (value: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(value) });
  beforeEach(() => {
    resetCsrfToken();
    resetApiCache('user-1:unit-6');
    fetchMock.mockReset();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
  });
  afterEach(() => { resetApiCache(); jest.restoreAllMocks(); });

  it('reuses a fresh response and deduplicates concurrent requests', async () => {
    fetchMock.mockResolvedValue(response([{ id: 1 }]));
    await Promise.all([apiGet('/categories?unit_id=6'), apiGet('/categories?unit_id=6')]);
    expect(await apiGet('/categories?unit_id=6')).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('always fetches orders, order details and personal data exports', async () => {
    fetchMock.mockResolvedValue(response([]));
    for (const path of ['/orders', '/orders/10', '/users/me/export']) {
      await apiGet(path); await apiGet(path);
    }
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('fetches again after the freshness period expires', async () => {
    const timestamp = Date.now();
    const now = jest.spyOn(Date, 'now').mockReturnValue(timestamp);
    fetchMock.mockResolvedValue(response([]));
    await apiGet('/products/manage?unit_id=6');
    now.mockReturnValue(timestamp + 299_999);
    await apiGet('/products/manage?unit_id=6');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    now.mockReturnValue(timestamp + 300_001);
    expect(peekApiData('/products/manage?unit_id=6')).toBeUndefined();
    await apiGet('/products/manage?unit_id=6');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates reads after a successful mutation', async () => {
    fetchMock.mockResolvedValueOnce(response([{ name: 'Before' }]))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ csrf_token: 'test-csrf-token' }) })
      .mockResolvedValueOnce(response({ name: 'After' }))
      .mockResolvedValueOnce(response([{ name: 'After' }]));
    await apiGet('/categories?unit_id=6');
    await apiPatch('/categories/1', { name: 'After' });
    expect(peekApiData('/categories?unit_id=6')).toBeUndefined();
    expect(await apiGet('/categories?unit_id=6')).toEqual([{ name: 'After' }]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('clears previous unit and user data on a context change', async () => {
    fetchMock.mockResolvedValue(response([{ id: 6 }]));
    await apiGet('/categories');
    resetApiCache('user-1:unit-7');
    expect(peekApiData('/categories')).toBeUndefined();
    await apiGet('/categories');
    resetApiCache('user-2:unit-7');
    await apiGet('/categories');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not cache failed requests and allows a retry', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(response([]));
    await expect(apiGet('/categories')).rejects.toThrow();
    await expect(apiGet('/categories')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('can explicitly refresh a cached resource', async () => {
    fetchMock.mockResolvedValue(response([]));
    await apiGet('/categories');
    await apiGet('/categories', { cache: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('removes query data on logout rather than persisting private responses', async () => {
    fetchMock.mockResolvedValue(response([{ id: 6 }]));
    await apiGet('/categories');
    const key = apiQueryKey('/categories');
    resetApiCache();
    expect(panelQueryClient.getQueryData(key)).toBeUndefined();
  });
});
