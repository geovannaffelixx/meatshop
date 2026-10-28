/* global cy, describe, it */

const protectedPages = [
  '/select-unit', '/dashboard', '/orders', '/orders/1', '/chat', '/deliveries', '/notifications',
  '/products', '/products/new', '/products/1', '/categories', '/promotions', '/coupons',
  '/recipes', '/recipes/new', '/recipes/1', '/reviews', '/finance', '/audit',
  '/settings/account', '/settings/unit', '/settings/users', '/settings/legal', '/settings/security', '/settings/profile',
  '/support', '/support/1',
];

describe('Private page access', () => {
  for (const path of protectedPages) {
    it(`rejects a fabricated cookie at ${path}`, () => {
      cy.setCookie('access_token', 'fabricated-session');
      cy.intercept('GET', 'http://localhost:3001/users/me', { statusCode: 401, body: { message: 'Unauthorized' } });
      cy.intercept('POST', 'http://localhost:3001/auth/refresh', { statusCode: 401, body: { message: 'Unauthorized' } });
      cy.intercept('GET', 'http://localhost:3001/auth/csrf', { csrf_token: 'test-csrf' });
      cy.visit(path);
      cy.location('pathname').should('eq', '/login');
      cy.get('#login-email').should('be.visible');
    });
  }

  for (const path of ['/finance', '/audit', '/settings/unit', '/settings/users']) {
    it(`denies an operator without permission at ${path}`, () => {
      cy.setCookie('access_token', 'operator-session');
      cy.intercept('GET', 'http://localhost:3001/users/me', { user: { id: 7, name: 'Operator', global_role: 'USER' }, panel: { can_access: true, memberships: [{ unit_id: 1, unit_name: 'Unidade teste', role: 'OPERATOR', permissions: ['VIEW_DASHBOARD', 'MANAGE_ORDERS', 'MANAGE_PRODUCTS', 'MANAGE_CATEGORIES', 'VIEW_DELIVERIES'] }] } });
      cy.visit(path);
      cy.location('pathname').should('eq', '/no-panel-access');
      cy.contains('Acesso indisponível').should('be.visible');
    });
  }
  it('keeps authentication and recovery screens publicly accessible', () => {
    cy.clearCookies();
    for (const path of ['/login', '/forgot-password', '/reset-password']) {
      cy.visit(path);
      cy.location('pathname').should('eq', path);
      cy.get('main h1').should('be.visible');
    }
  });
});
