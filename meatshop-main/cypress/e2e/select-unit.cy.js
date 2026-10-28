/* global cy, describe, it, beforeEach, expect */
import { panel } from '../fixtures/panel';

const memberships = [
  { unit_id: 1, unit_name: 'Açougue Central', unit_image_url: null, role: 'MANAGER', permissions: ['VIEW_DASHBOARD', 'MANAGE_PRODUCTS'] },
  { unit_id: 2, unit_name: 'Açougue do Bairro', unit_image_url: null, role: 'OPERATOR', permissions: ['VIEW_DASHBOARD', 'MANAGE_ORDERS'] },
];
function session(units = memberships, userId = 1) {
  cy.intercept('GET', 'http://localhost:3001/users/me', { user: { id: userId, name: 'Maria Silva', email: 'maria@example.com', global_role: 'USER' }, panel: { can_access: units.length > 0, requires_unit_selection: units.length > 1, memberships: units } });
}

describe('Choosing a unit', () => {
  beforeEach(() => {
    panel(); session();
    cy.intercept('GET', 'http://localhost:3001/dashboard*', { revenueThisMonth: 0, weeklyChart: { series: [] }, recentOrders: [], pendingOrdersCount: 0, lowStockCount: 0, topProducts: [] });
    cy.intercept('GET', 'http://localhost:3001/promotions/manage*', { data: [], meta: { total: 0 } });
  });

  it('shows cards after login even when another unit was previously saved', () => {
    cy.intercept('POST', 'http://localhost:3001/auth/login', {});
    cy.visit('/login', { onBeforeLoad(window) { window.localStorage.setItem('meatshop:selected-unit-id', '1'); window.localStorage.setItem('meatshop:selected-unit-user-id', '1'); } });
    cy.get('#login-email').type('maria@example.com');
    cy.get('#login-password').type('Password123!');
    cy.contains('button', /^Entrar$/).click();
    cy.location('pathname').should('eq', '/select-unit');
    cy.contains('h1', 'Em qual unidade vamos trabalhar?').should('be.visible');
    cy.get('button[aria-label="Acessar Açougue Central como Gerente"]').should('be.visible');
    cy.get('button[aria-label="Acessar Açougue do Bairro como Operador"]').click();
    cy.location('pathname').should('eq', '/dashboard');
    cy.window().then(window => expect(window.localStorage.getItem('meatshop:selected-unit-id')).to.eq('2'));
    cy.reload();
    cy.location('pathname').should('eq', '/dashboard');
    cy.get('button[aria-label="Trocar unidade"]').should('contain', 'Açougue do Bairro');
    cy.get('a[href="/products"]').should('not.exist');
  });

  it('blocks a direct panel URL until a unit is chosen and supports search on mobile', () => {
    cy.viewport(390, 844);
    cy.visit('/products');
    cy.location('pathname').should('eq', '/select-unit');
    cy.get('input[type="search"]').type('central');
    cy.get('button[aria-label^="Acessar "]').should('have.length', 1).and('contain', 'Açougue Central');
    cy.get('input[type="search"]').clear().type('inexistente');
    cy.contains('Nenhuma unidade encontrada').should('be.visible');
    cy.contains('button', 'Limpar busca').click();
    cy.get('button[aria-label^="Acessar "]').should('have.length', 2);
    cy.document().then(document => expect(document.documentElement.scrollWidth).to.be.at.most(390));
    cy.screenshot('select-unit-mobile', { capture: 'fullPage' });
  });

  it('does not reuse a unit saved by another account and remains protected from anonymous access', () => {
    session(memberships, 9);
    cy.visit('/dashboard', { onBeforeLoad(window) { window.localStorage.setItem('meatshop:selected-unit-id', '1'); window.localStorage.setItem('meatshop:selected-unit-user-id', '1'); } });
    cy.location('pathname').should('eq', '/select-unit');
    cy.clearCookies();
    cy.intercept('GET', 'http://localhost:3001/users/me', { statusCode: 401, body: { message: 'Unauthorized' } });
    cy.intercept('POST', 'http://localhost:3001/auth/refresh', { statusCode: 401, body: { message: 'Unauthorized' } });
    cy.visit('/select-unit');
    cy.location('pathname').should('eq', '/login');
  });

  it('enters directly when only one unit is accessible', () => {
    session([memberships[0]]);
    cy.visit('/select-unit');
    cy.location('pathname').should('eq', '/dashboard');
  });

  it('handles an account without administrative unit memberships', () => {
    session([]);
    cy.visit('/select-unit');
    cy.location('pathname').should('eq', '/no-panel-access');
  });

  it('shows many units in a responsive grid', () => {
    session(Array.from({ length: 12 }, (_, index) => ({ ...memberships[index % 2], unit_id: index + 1, unit_name: `Açougue ${index + 1}` })));
    cy.viewport(1440, 900);
    cy.visit('/select-unit');
    cy.get('button[aria-label^="Acessar "]').should('have.length', 12);
    cy.screenshot('select-unit-desktop', { capture: 'viewport' });
  });
});
