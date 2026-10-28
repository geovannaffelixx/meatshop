import { proxy } from './proxy';
import type { NextRequest } from 'next/server';

jest.mock('@/shared/config/api-url', () => ({ API_URL: '/api' }));
jest.mock('next/server', () => ({ NextResponse: { next: () => ({ status: 200 }), redirect: (url: URL) => ({ status: 307, location: url.toString() }) } }));

function request(path = '/dashboard', hasCookie = false): NextRequest {
  return { url: `http://0.0.0.0:3000${path}`, nextUrl: { pathname: path, hostname: '0.0.0.0' }, headers: { get: (name: string) => name === 'host' ? 'localhost:3000' : null }, cookies: { has: () => hasCookie } } as unknown as NextRequest;
}
describe('Web proxy authentication', () => {
  it('redirects private pages without credentials to the browser host with a relative API URL', () => {
    expect(proxy(request())).toEqual({ status: 307, location: 'http://localhost:3000/login' });
  });
  it('leaves authentication validation to the client and API when a cookie is present', () => {
    expect(proxy(request('/audit', true))).toEqual({ status: 200 });
  });
  it('keeps public pages available without credentials', () => {
    expect(proxy(request('/login'))).toEqual({ status: 200 });
  });
});
