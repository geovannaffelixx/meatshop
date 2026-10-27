import type { Request } from 'express';
import { createCsrfToken, requiresCsrf, validCsrfToken } from './csrf';

describe('CSRF contract', () => {
  const request = (method: string, path: string, cookies = {}, authorization = '') =>
    ({ method, path, cookies, get: () => authorization }) as unknown as Request;
  it('accepts only matching random tokens', () => {
    const token = createCsrfToken();
    expect(validCsrfToken(token, token)).toBe(true);
    expect(validCsrfToken(token, createCsrfToken())).toBe(false);
    expect(validCsrfToken(token, undefined)).toBe(false);
    expect(validCsrfToken('short', 'short')).toBe(false);
  });
  it('requires double submit for cookie-authenticated mutations, including refresh/logout/uploads', () => {
    for (const path of ['/auth/refresh', '/auth/logout', '/support-tickets/1/messages']) {
      expect(requiresCsrf(request('POST', path, { refresh_token: 'session' }))).toBe(true);
    }
    expect(requiresCsrf(request('GET', '/users/me', { access_token: 'session' }))).toBe(false);
    expect(requiresCsrf(request('POST', '/auth/login', { access_token: 'session' }))).toBe(false);
    expect(requiresCsrf(request('POST', '/orders', {}, 'Bearer mobile-token'))).toBe(false);
    expect(
      requiresCsrf(request('POST', '/orders', { access_token: 'session' }, 'Basic ignored')),
    ).toBe(true);
  });
});
