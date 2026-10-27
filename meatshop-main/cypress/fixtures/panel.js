/* global cy */
export const product = { id: 1, unit_id: 1, name: 'Picanha teste', price: 50, active: true,
  unit_of_measure: 'kg', category_id: 1, category_name: 'Carnes', category: { id: 1, name: 'Carnes', active: true },
  stock_quantity: 10, stock_min_quantity: 1, brand: 'Teste', description: 'Produto de teste' };
export const page = (data) => ({ data, meta: { page: 1, limit: 10, total: data.length, totalPages: 1 } });
export function panel() {
  cy.setCookie('access_token', 'test-session');
  const permissions = ['VIEW_DASHBOARD','MANAGE_PRODUCTS','MANAGE_CATEGORIES','MANAGE_ORDERS',
    'VIEW_FINANCE','MANAGE_FINANCE','MANAGE_UNIT','MANAGE_MEMBERS','VIEW_DELIVERIES','MANAGE_DELIVERIES'];
  cy.intercept('GET', 'http://localhost:3001/users/me', { user: { id: 1, name: 'Owner', email: 'owner@example.com', global_role: 'USER' },
    panel: { can_access: true, requires_unit_selection: false, memberships: [
      { unit_id: 1, unit_name: 'Unidade teste', unit_image_url: null, role: 'OWNER', permissions }] } });
  cy.intercept('GET', 'http://localhost:3001/auth/csrf', { csrf_token: 'test-csrf-token' });
  cy.intercept('GET', 'http://localhost:3001/legal/pending*', { enforced: false, documents: [] });
  cy.intercept('GET', 'http://localhost:3001/notifications*', []);
  cy.intercept('GET', 'http://localhost:3001/categories*', [{ id: 1, name: 'Carnes', active: true }]);
  cy.intercept('GET', 'http://localhost:3001/products/manage*', page([product]));
}
