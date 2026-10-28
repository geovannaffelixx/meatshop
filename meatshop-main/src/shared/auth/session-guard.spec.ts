import { shouldRedirectToLogin, type SessionGuardInput } from './session-guard';

const sameHost: SessionGuardInput = {
  pathname: '/dashboard',
  requestHostname: 'localhost',
  apiUrl: 'http://localhost:3001',
  hasSessionCookie: false,
  fetchSite: 'same-origin',
};

describe('server-side session guard', () => {
  it('redirects anonymous panel requests when the API cookies are visible to the web host', () => {
    expect(shouldRedirectToLogin(sameHost)).toBe(true);
    expect(shouldRedirectToLogin({ ...sameHost, pathname: '/orders/42', fetchSite: 'none' })).toBe(true);
    expect(shouldRedirectToLogin({ ...sameHost, fetchSite: null })).toBe(true);
  });

  it('lets requests with any session cookie through to the client guard', () => {
    expect(shouldRedirectToLogin({ ...sameHost, hasSessionCookie: true })).toBe(false);
  });

  it('keeps the shared public routes public', () => {
    for (const pathname of ['/', '/login', '/register', '/reset-password', '/verify-email', '/payment-return', '/no-panel-access']) {
      expect(shouldRedirectToLogin({ ...sameHost, pathname })).toBe(false);
    }
  });

  it('degrades to the client guard when the API lives on another host', () => {
    expect(shouldRedirectToLogin({ ...sameHost, requestHostname: 'painel.meatshop.app', apiUrl: 'https://api.meatshop.app' })).toBe(false);
    expect(shouldRedirectToLogin({ ...sameHost, apiUrl: 'not a url' })).toBe(false);
  });

  it('does not trust a missing SameSite cookie on cross-site navigations', () => {
    expect(shouldRedirectToLogin({ ...sameHost, fetchSite: 'cross-site' })).toBe(false);
  });
  it('protects private pages when API requests use the same-origin proxy', () => {
    expect(shouldRedirectToLogin({ ...sameHost, apiUrl: '/api' })).toBe(true);
    expect(shouldRedirectToLogin({ ...sameHost, apiUrl: '/api', hasSessionCookie: true })).toBe(false);
    expect(shouldRedirectToLogin({ ...sameHost, apiUrl: '//other.example/api' })).toBe(false);
  });
});
