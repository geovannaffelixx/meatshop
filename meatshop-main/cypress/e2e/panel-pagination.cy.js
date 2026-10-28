/* global cy, describe, it, expect */
import { panel } from '../fixtures/panel';

const paginated = (data, page, total) => ({ data, meta: { page, limit: 10, total, totalPages: Math.ceil(total / 10) } });
const event = id => ({ id, description: 'Evento de teste', action: 'USER_UPDATED', entity: 'User', entity_id: '1', actor_type: 'USER', outcome: 'SUCCESS', created_at: '2026-10-27T12:00:00Z', old_data: '{"name":"Antes"}', new_data: '{"name":"Depois"}', user: { id: 1, name: 'Admin' }, unit: { id: 1, name: 'Unidade teste' } });
function admin(units = 1) {
  panel();
  cy.intercept('GET', 'http://localhost:3001/users/me', { user: { id: 1, name: 'Admin', email: 'admin@example.com', global_role: 'SUPER_ADMIN' }, panel: { can_access: true, requires_unit_selection: false, memberships: Array.from({ length: units }, (_, index) => ({ unit_id: index + 1, unit_name: `Unidade ${index + 1}`, role: 'OWNER', permissions: ['VIEW_DELIVERIES', 'MANAGE_DELIVERIES'] })) } });
  cy.intercept('GET', 'http://localhost:3001/audit-logs/summary', { total: 11, success: 11, failure: 0, last24Hours: 11 });
  cy.intercept({ method: 'GET', pathname: '/audit-logs', port: 3001 }, req => {
    const page = Number(req.query.page || 1);
    expect(req.query.limit).to.eq('10');
    req.reply(paginated(page === 1 ? Array.from({ length: 10 }, (_, index) => event(index + 1)) : [event(11)], page, 11));
  }).as('auditPage');
  cy.intercept('GET', 'http://localhost:3001/audit-logs/11', event(11));
}

describe('Panel pagination and account controls', () => {
  it('requests the next audit page and opens the separate event dialog on mobile', () => {
    admin();
    cy.viewport(390, 844);
    cy.visit('/audit');
    cy.wait('@auditPage');
    cy.get('nav[aria-label="Paginação"] button[aria-label="Próxima página"]').click();
    cy.wait('@auditPage').its('request.query.page').should('eq', '2');
    cy.get('button[aria-label="Detalhar evento 11"]').click();
    cy.get('[role="dialog"]').should('contain', 'Informações do evento').and('contain', 'USER_UPDATED');
    cy.get('[role="dialog"]').contains('button', 'Fechar').should('be.visible').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('scrolls a long unit list and shows the updated profile drawer header', () => {
    admin(40);
    cy.viewport(1440, 900);
    cy.visit('/select-unit');
    cy.get('button[aria-label="Acessar Unidade 1 como Administrador do sistema"]').click();
    cy.get('button[aria-label="Trocar unidade"]').click();
    cy.get('[role="menu"] [role="group"]').then(group => expect(group[0].scrollHeight).to.be.greaterThan(group[0].clientHeight));
    cy.get('[role="menuitemradio"]').last().scrollIntoView().should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('button[aria-label="Abrir perfil do usuário"]').click();
    cy.get('[role="dialog"]').should('contain', 'Meu perfil').and('contain', 'Sua conta e seus acessos.');
    cy.screenshot('profile-drawer-desktop');
  });

  it('requests delivery people ten at a time using the shared table', () => {
    panel();
    const people = Array.from({ length: 11 }, (_, index) => ({ membershipId: index + 1, membershipStatus: 'ACTIVE', user: { id: index + 1, name: `Entregador ${index + 1}`, email: `courier${index + 1}@example.com` }, profileStatus: 'ACTIVE', deliveryPersonId: index + 1, isOnline: false, vehicle: null, activeOrderId: null }));
    cy.intercept('GET', 'http://localhost:3001/delivery/units/1/live', { unit: { id: 1, name: 'Unidade teste', latitude: null, longitude: null }, deliveries: [], generatedAt: '2026-10-27T12:00:00Z' });
    cy.intercept('GET', 'http://localhost:3001/delivery/units/1/people*', req => {
      if (req.query.paginated === 'true') {
        expect(req.query.limit).to.eq('10');
        const page = Number(req.query.page);
        req.alias = 'peoplePage';
        req.reply(paginated(people.slice((page - 1) * 10, page * 10), page, people.length));
      } else req.reply(people);
    });
    cy.visit('/deliveries');
    cy.contains('button', /^Entregadores$/).click();
    cy.wait('@peoplePage');
    cy.get('table.data-table tbody tr').should('have.length', 10);
    cy.get('nav[aria-label="Paginação"] button[aria-label="Próxima página"]').click();
    cy.wait('@peoplePage').its('request.query.page').should('eq', '2');
    cy.get('table.data-table tbody tr').should('have.length', 1).and('contain', 'Entregador 11');
    cy.screenshot('delivery-people-table');
  });
});
